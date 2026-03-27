"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, Flashlight, FlashlightOff, SwitchCamera, ScanBarcode, Hash, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector";

interface BarcodeScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
    isOpen: boolean;
    mode?: "upc" | "serial";
}

export default function BarcodeScanner({ onScan, onClose, isOpen, mode = "upc" }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [torch, setTorch] = useState(false);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [error, setError] = useState("");
    const [manualInput, setManualInput] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    const [detectorReady, setDetectorReady] = useState(false);

    // Detected barcode — shown for user confirmation before processing
    const [detectedValue, setDetectedValue] = useState("");
    const [scanCount, setScanCount] = useState(0);

    // Initialize BarcodeDetector polyfill
    useEffect(() => {
        const formats = mode === "upc"
            ? ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] as any
            : ['code_128', 'code_39', 'code_93', 'qr_code', 'ean_13', 'itf'] as any;

        try {
            detectorRef.current = new BarcodeDetectorPolyfill({ formats });
            setDetectorReady(true);
        } catch (e) {
            console.error("BarcodeDetector init error:", e);
            detectorRef.current = null;
            setDetectorReady(false);
        }
    }, [mode]);

    const stopScanning = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const stopCamera = useCallback(() => {
        stopScanning();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    }, [stopScanning]);

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

    // Detection loop — pauses when we have a detected value pending confirmation
    useEffect(() => {
        if (!isOpen || !isScanning || !detectorRef.current || detectedValue) return;

        let active = true;

        const detect = async () => {
            if (!active || !videoRef.current || !detectorRef.current) return;

            const video = videoRef.current;
            if (video.readyState < video.HAVE_ENOUGH_DATA) return;

            try {
                const barcodes = await detectorRef.current.detect(video);
                if (barcodes.length > 0 && active) {
                    let value = barcodes[0].rawValue?.trim();
                    const format = barcodes[0].format;
                    // ZXing reads UPC-A as EAN-13 with a leading "0" — strip it
                    if (value && value.length === 13 && value.startsWith("0") &&
                        (format === "ean_13" || format === "upc_a")) {
                        value = value.substring(1);
                    }
                    // Only accept non-empty values
                    if (value && value.length > 0) {
                        active = false;
                        stopScanning();
                        setDetectedValue(value);
                        setScanCount(prev => prev + 1);
                        if (navigator.vibrate) navigator.vibrate(100);
                    }
                }
            } catch (e) {
                // Detection can fail on some frames
            }
        };

        intervalRef.current = setInterval(detect, 300);

        return () => {
            active = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isOpen, isScanning, detectedValue, stopScanning]);

    // Open/close camera lifecycle
    useEffect(() => {
        if (isOpen) {
            startCamera();
            setShowManualInput(false);
            setManualInput("");
            setDetectedValue("");
            setScanCount(0);
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
        if (isOpen) {
            startCamera();
        }
    }, [facingMode]);

    // Confirm the detected barcode → send to parent
    const handleConfirm = () => {
        if (detectedValue) {
            onScan(detectedValue);
            setDetectedValue("");
        }
    };

    // Reject → re-scan
    const handleRescan = () => {
        setDetectedValue("");
        // Detection loop will restart automatically since detectedValue becomes ""
    };

    const handleManualSubmit = () => {
        const val = manualInput.trim().toUpperCase();
        if (val) {
            onScan(val);
            setManualInput("");
        }
    };

    if (!isOpen) return null;

    const isUpcMode = mode === "upc";
    const title = isUpcMode ? "Escanear UPC" : "Escanear Serial / IMEI";
    const hint = isUpcMode
        ? "Ubica el código de barras del producto"
        : "Ubica el serial o IMEI del dispositivo";
    const isActivelyScanning = isScanning && detectorReady && !detectedValue;

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
                    {isActivelyScanning && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
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

                    <div className={cn("relative z-10", isUpcMode ? "w-72 h-44" : "w-80 h-36")}>
                        <div className="absolute inset-0 bg-transparent" style={{
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)"
                        }} />

                        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-blue-400 rounded-br-lg" />

                        {!detectedValue && (
                            <div className="absolute left-2 right-2 h-0.5 bg-blue-400/80 animate-pulse"
                                style={{
                                    top: "50%",
                                    boxShadow: "0 0 8px 2px rgba(96,165,250,0.5)"
                                }}
                            />
                        )}
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
            </div>

            {/* Bottom area — detected value confirmation OR manual input */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pb-24 pt-6">

                {/* DETECTED VALUE — confirmation panel */}
                {detectedValue ? (
                    <div className="animate-in slide-in-from-bottom-4 duration-200">
                        <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest text-center mb-2">
                            ✓ Código Detectado
                        </p>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-3">
                            <p className="text-white font-mono font-bold text-xl text-center tracking-wider break-all">
                                {detectedValue}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRescan}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-white/20 rounded-xl text-white/70 font-bold text-sm uppercase tracking-wider active:bg-white/10"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reintentar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 rounded-xl text-white font-bold text-sm uppercase tracking-wider active:bg-emerald-700 shadow-lg shadow-emerald-600/30"
                            >
                                <Check className="w-4 h-4" />
                                Usar Código
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-white/50 font-bold text-[10px] uppercase tracking-widest text-center mb-3">
                            {hint}
                        </p>

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
                    </>
                )}
            </div>
        </div>
    );
}
