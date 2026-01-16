"use client";

import { useEffect, useState } from "react";
import { getOperators, verifyOperatorPin } from "@/app/directory/team/actions";
import { motion, AnimatePresence } from "framer-motion";
import { X, User as UserIcon, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Operator {
    id: string;
    name: string;
}

interface PinValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (operatorId: string, pin: string) => void;
    title?: string;
    description?: string;
}

export function PinValidationModal({ isOpen, onClose, onSuccess, title = "Firma de Operador", description = "Selecciona tu usuario e ingresa tu PIN" }: PinValidationModalProps) {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerifyLoading, setIsVerifyLoading] = useState(false);

    // Fetch operators on mount
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getOperators()
                .then(data => {
                    setOperators(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setError("Error cargando operadores");
                    setIsLoading(false);
                });

            // Reset state
            setPin("");
            setSelectedOperatorId(null);
            setError(null);
        }
    }, [isOpen]);

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError(null);
        }
    };

    const handleClear = () => {
        setPin("");
        setError(null);
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError(null);
    };

    const handleSubmit = async () => {
        if (!selectedOperatorId) {
            setError("Debes seleccionar un operador.");
            return;
        }
        if (pin.length < 4) {
            setError("PIN incompleto.");
            return;
        }

        setIsVerifyLoading(true);
        const result = await verifyOperatorPin(selectedOperatorId, pin);
        setIsVerifyLoading(false);

        if (result.success) {
            onSuccess(selectedOperatorId, pin);
            onClose();
        } else {
            setError(result.error || "PIN Incorrecto");
            setPin(""); // Clear pin on error
        }
    };

    // Auto-submit on 4th digit? Maybe safer to click Enter or auto?
    // User requested "cambio entre Mateo y Maria... menos de 3 segundos".
    // Auto-submit is faster.
    useEffect(() => {
        if (pin.length === 4 && selectedOperatorId) {
            handleSubmit();
        }
    }, [pin, selectedOperatorId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
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

                        {/* Operator Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operador</label>
                            {isLoading ? (
                                <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {operators.map(op => (
                                        <button
                                            key={op.id}
                                            onClick={() => { setSelectedOperatorId(op.id); setPin(""); setError(null); }}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                                                selectedOperatorId === op.id
                                                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                                                    : "border-slate-100 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                                selectedOperatorId === op.id ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {op.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-sm truncate">{op.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PIN Display */}
                        <div className="space-y-4">
                            <div className="flex justify-center gap-4 py-4">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={cn(
                                        "w-4 h-4 rounded-full transition-all duration-300",
                                        i < pin.length ? "bg-slate-900 scale-125" : "bg-slate-200"
                                    )} />
                                ))}
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumberClick(num.toString())}
                                        className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 text-2xl font-black text-slate-900 transition-colors active:scale-95 flex items-center justify-center shadow-sm border border-slate-100"
                                        disabled={isVerifyLoading}
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={handleClear}
                                    className="h-16 rounded-xl text-slate-400 font-bold hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                                >
                                    C
                                </button>
                                <button
                                    onClick={() => handleNumberClick("0")}
                                    className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 text-2xl font-black text-slate-900 transition-colors active:scale-95 flex items-center justify-center shadow-sm border border-slate-100"
                                    disabled={isVerifyLoading}
                                >
                                    0
                                </button>
                                <button
                                    onClick={handleBackspace}
                                    className="h-16 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center"
                                >
                                    ⌫
                                </button>
                            </div>
                        </div>

                        {/* Verify Loading Overlay */}
                        {isVerifyLoading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                                <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Example usage:
// const [showPinModal, setShowPinModal] = useState(false);
// ...
// <PinValidationModal
//    isOpen={showPinModal}
//    onClose={() => setShowPinModal(false)}
//    onSuccess={(operatorId) => { handleSaveWithOperator(operatorId); }}
// />
