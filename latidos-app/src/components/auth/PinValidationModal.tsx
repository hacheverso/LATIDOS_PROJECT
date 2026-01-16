"use client";

import { useEffect, useState, useRef } from "react";
import { identifyOperatorByPin } from "@/app/directory/team/actions";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (operatorId: string, pin: string, operatorName: string) => void;
    title?: string;
    description?: string;
}

export function PinValidationModal({ isOpen, onClose, onSuccess, title = "Firma de Operador", description = "Ingresa tu PIN personal" }: PinValidationModalProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isVerifyLoading, setIsVerifyLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setPin("");
            setError(null);
            // Slight delay to ensure render
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (pin.length < 4) {
            setError("PIN incompleto.");
            return;
        }

        setIsVerifyLoading(true);
        // Use IDENTIFY instead of VERIFY
        const result = await identifyOperatorByPin(pin);
        setIsVerifyLoading(false);

        if (result.success && result.operator) {
            onSuccess(result.operator.id, pin, result.operator.name);
            onClose();
        } else {
            setError(result.error || "PIN Code Incorrecto");
            setPin("");
            inputRef.current?.focus();
        }
    };

    // Auto-submit on 4th digit
    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
                >
                    {/* Header */}
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                            <p className="text-sm text-slate-500">{description}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}

                        {/* Secure PIN Input */}
                        <div className="space-y-4 relative">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
                                Ingresa tu PIN de Seguridad
                            </label>

                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={pin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setPin(val);
                                        setError(null);
                                    }}
                                    disabled={isVerifyLoading}
                                    className={cn(
                                        "w-full h-16 pl-4 pr-4 text-center bg-slate-50 border-2 rounded-2xl text-4xl font-black text-slate-900 tracking-[1em] outline-none transition-all placeholder:text-slate-300",
                                        error ? "border-red-200 bg-red-50 focus:border-red-500" : "border-slate-200 focus:border-blue-500 focus:bg-white",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                    placeholder="••••"
                                    autoComplete="off"
                                />

                                {isVerifyLoading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-slate-400 font-medium text-center">
                                El sistema identificará tu usuario automáticamente
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
