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
    const animationRef = useRef<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState("");
    const [torch, setTorch] = useState(false);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [error, setError] = useState("");
    const [manualInput, setManualInput] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);

    const stopCamera = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
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

    // BarcodeDetector-based scanning loop
    const scanLoop = useCallback(async () => {
        if (!videoRef.current || !isScanning) return;

        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            animationRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        if (window.BarcodeDetector) {
            try {
                // Barcode formats for both modes — we scan the same way,
                // the parent decides what to do with the result
                const formats = mode === "upc"
                    ? ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
                    : ['code_128', 'code_39', 'code_93', 'qr_code', 'ean_13', 'itf', 'data_matrix'];

                const detector = new window.BarcodeDetector({ formats });
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                    const value = barcodes[0].rawValue;
                    if (value && value !== lastScanned) {
                        setLastScanned(value);
                        onScan(value);
                        setTimeout(() => setLastScanned(""), 2000);
                        return;
                    }
                }
            } catch (e) {
                // BarcodeDetector failed, continue
            }
        }

        animationRef.current = requestAnimationFrame(scanLoop);
    }, [isScanning, lastScanned, onScan, mode]);

    useEffect(() => {
        if (isOpen && isScanning) {
            animationRef.current = requestAnimationFrame(scanLoop);
        }
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isOpen, isScanning, scanLoop]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
            setShowManualInput(false);
            setManualInput("");
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

    useEffect(() => {
        if (isOpen && facingMode) {
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
    const accentColor = isUpcMode ? "blue" : "indigo";
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
                    <div className="absolute inset-0 bg-black/50" />

                    {/* Scan rectangle — wider for IMEI/serials */}
                    <div className={cn("relative z-10", isUpcMode ? "w-72 h-40" : "w-80 h-32")}>
                        <div className="absolute inset-0 bg-transparent" style={{
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)"
                        }} />

                        {/* Corner indicators */}
                        <div className={`absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-${accentColor}-400 rounded-tl-lg`} />
                        <div className={`absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-${accentColor}-400 rounded-tr-lg`} />
                        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-${accentColor}-400 rounded-bl-lg`} />
                        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-${accentColor}-400 rounded-br-lg`} />

                        {/* Scanning line */}
                        <div className={`absolute left-2 right-2 h-0.5 bg-${accentColor}-400/80 animate-pulse`}
                            style={{
                                top: "50%",
                                boxShadow: `0 0 8px 2px ${isUpcMode ? 'rgba(96,165,250,0.5)' : 'rgba(129,140,248,0.5)'}`
                            }}
                        />
                    </div>
                </div>

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

                {/* Manual input toggle — especially useful for serial/IMEI if BarcodeDetector struggles */}
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
                        className="w-full py-3 border border-white/20 rounded-xl text-white/60 font-bold text-xs uppercase tracking-wider"
                    >
                        Escribir manualmente
                    </button>
                )}
            </div>
        </div>
    );
}
