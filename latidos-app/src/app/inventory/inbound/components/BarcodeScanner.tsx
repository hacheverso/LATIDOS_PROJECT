"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, Flashlight, FlashlightOff, SwitchCamera, ScanBarcode, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
    interface Window {
        BarcodeDetector?: any;
    }
}

interface BarcodeScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
    isOpen: boolean;
    /** 'upc' scans product barcodes, 'serial' scans serial numbers / IMEIs */
    mode?: "upc" | "serial";
}

export default function BarcodeScanner({ onScan, onClose, isOpen, mode = "upc" }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState("");
    const [torch, setTorch] = useState(false);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [error, setError] = useState("");
    const [manualInput, setManualInput] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    const [hasBarcodeApi, setHasBarcodeApi] = useState(true);

    // Initialize BarcodeDetector once
    useEffect(() => {
        if (typeof window !== "undefined" && window.BarcodeDetector) {
            const formats = mode === "upc"
                ? ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
                : ['code_128', 'code_39', 'code_93', 'qr_code', 'ean_13', 'itf', 'data_matrix'];

            try {
                detectorRef.current = new window.BarcodeDetector({ formats });
                setHasBarcodeApi(true);
            } catch {
                detectorRef.current = null;
                setHasBarcodeApi(false);
            }
        } else {
            detectorRef.current = null;
            setHasBarcodeApi(false);
        }
    }, [mode]);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    }, []);

    const startCamera = useCallback(async () => {
        try {
            setError("");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsScanning(true);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("No se pudo acceder a la cámara. Verifica los permisos.");
        }
    }, [facingMode]);

    // Scan loop using setInterval (more reliable on iOS than requestAnimationFrame)
    useEffect(() => {
        if (!isOpen || !isScanning || !detectorRef.current) return;

        let scanning = true;

        const detect = async () => {
            if (!scanning || !videoRef.current || !detectorRef.current) return;

            const video = videoRef.current;
            if (video.readyState < video.HAVE_ENOUGH_DATA) return;

            try {
                const barcodes = await detectorRef.current.detect(video);
                if (barcodes.length > 0 && scanning) {
                    const value = barcodes[0].rawValue;
                    if (value) {
                        scanning = false; // Stop scanning after first detection
                        setLastScanned(value);

                        // Vibrate for haptic feedback if available
                        if (navigator.vibrate) navigator.vibrate(100);

                        onScan(value);

                        // Clear after showing feedback
                        setTimeout(() => setLastScanned(""), 2000);
                    }
                }
            } catch (e) {
                // Silently continue — detection fails occasionally on some frames
            }
        };

        // Scan every 250ms — fast enough to feel instant, slow enough for iOS Safari
        intervalRef.current = setInterval(detect, 250);

        return () => {
            scanning = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isOpen, isScanning, onScan]);

    // Start/stop camera when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            startCamera();
            setShowManualInput(false);
            setManualInput("");
            setLastScanned("");
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, startCamera, stopCamera]);

    const toggleTorch = useCallback(async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) {
            await (track as any).applyConstraints({ advanced: [{ torch: !torch }] });
            setTorch(!torch);
        }
    }, [torch]);

    const flipCamera = useCallback(() => {
        stopCamera();
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
    }, [stopCamera]);

    // Restart camera when facing mode changes
    useEffect(() => {
        if (isOpen) {
            startCamera();
        }
    }, [facingMode]);

    const handleManualSubmit = () => {
        const val = manualInput.trim().toUpperCase();
        if (val) {
            setLastScanned(val);
            onScan(val);
            setManualInput("");
            setTimeout(() => setLastScanned(""), 2000);
        }
    };

    if (!isOpen) return null;

    const isUpcMode = mode === "upc";
    const title = isUpcMode ? "Escanear UPC" : "Escanear Serial / IMEI";
    const hint = isUpcMode
        ? "Ubica el código de barras del producto"
        : "Ubica el serial o IMEI del dispositivo";

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    {isUpcMode
                        ? <ScanBarcode className="w-4 h-4 text-blue-400" />
                        : <Hash className="w-4 h-4 text-indigo-400" />
                    }
                    <span className="text-white font-bold uppercase text-xs tracking-widest">
                        {title}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleTorch}
                        className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white"
                    >
                        {torch ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={flipCamera}
                        className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white"
                    >
                        <SwitchCamera className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Camera feed */}
            <div className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                />

                {/* Scan frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Scan rectangle — wider for IMEI/serials */}
                    <div className={cn("relative z-10", isUpcMode ? "w-72 h-44" : "w-80 h-36")}>
                        <div className="absolute inset-0 bg-transparent" style={{
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)"
                        }} />

                        {/* Corner indicators */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-blue-400 rounded-br-lg" />

                        {/* Scanning line */}
                        <div className="absolute left-2 right-2 h-0.5 bg-blue-400/80 animate-pulse"
                            style={{
                                top: "50%",
                                boxShadow: "0 0 8px 2px rgba(96,165,250,0.5)"
                            }}
                        />
                    </div>
                </div>

                {/* No BarcodeDetector API warning */}
                {!hasBarcodeApi && (
                    <div className="absolute top-20 left-4 right-4 z-30 bg-amber-600/90 text-white rounded-xl p-3 text-center">
                        <p className="font-bold text-xs">Detección automática no disponible</p>
                        <p className="text-[10px] mt-1 opacity-80">Usa el campo manual abajo para escribir el código</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
                        <div className="text-center p-8">
                            <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
                            <p className="text-white/70 font-bold text-sm">{error}</p>
                            <button
                                onClick={startCamera}
                                className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold text-sm"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* Scanned feedback */}
                {lastScanned && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 animate-in zoom-in-50 duration-200">
                        <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl font-mono font-bold text-base tracking-wider">
                            ✓ {lastScanned}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom area */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-6 pt-8 safe-area-bottom">
                <p className="text-white/50 font-bold text-[10px] uppercase tracking-widest text-center mb-3">
                    {hint}
                </p>

                {/* Manual input — always available as alternative */}
                {showManualInput ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
                            placeholder={isUpcMode ? "Escribir UPC..." : "Escribir Serial / IMEI..."}
                            autoFocus
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-mono font-bold text-sm placeholder:text-white/30 outline-none focus:border-blue-400"
                        />
                        <button
                            onClick={handleManualSubmit}
                            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm"
                        >
                            OK
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full py-3.5 border border-white/20 rounded-xl text-white/60 font-bold text-xs uppercase tracking-wider active:bg-white/10 transition-colors"
                    >
                        ✏️ Escribir manualmente
                    </button>
                )}
            </div>
        </div>
    );
}
