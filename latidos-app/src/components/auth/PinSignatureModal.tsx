"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Key, Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { identifyOperatorByPin } from "@/app/directory/team/actions";

interface PinSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (operator: { id: string; name: string }, pin: string) => void;
    actionName: string;
}

export function PinSignatureModal({ isOpen, onClose, onSuccess, actionName }: PinSignatureModalProps) {
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setPin("");
            setIsLoading(false);
        }
    }, [isOpen]);

    async function verifyPin(pinToVerify: string) {
        setIsLoading(true);
        try {
            const result = await identifyOperatorByPin(pinToVerify);
            if (result.success && result.operator) {
                toast.success(`Firma validada: ${result.operator.name}`);
                onSuccess(result.operator, pinToVerify);
                setPin("");
                onClose();
            } else {
                toast.error(result.error || "PIN de Operador Equivocado");
                setPin("");
            }
        } catch (error) {
            toast.error("Error al validar firma");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setPin(val);
        if (val.length === 4) {
            verifyPin(val);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-none bg-transparent shadow-none">
                <div className="bg-white w-full rounded-[32px] p-8 shadow-2xl relative overflow-hidden">

                    {/* Header Decoration */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-b-[50%]" />

                    <DialogHeader className="relative z-10 flex flex-col items-center pt-4">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 transform rotate-3 border-4 border-white/50">
                            <Lock className="w-10 h-10 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-800 text-center mb-1">Firma Digital Requerida</DialogTitle>
                        <p className="text-slate-500 text-center text-sm font-medium px-4 mb-2">
                            Para <span className="text-indigo-600 font-bold">{actionName}</span>, ingresa tu PIN de operador.
                        </p>
                    </DialogHeader>

                    <div className="w-full space-y-6 relative z-10 mt-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Key className="w-5 h-5 text-indigo-300 group-focus-within:text-indigo-600 transition-colors" />
                            </div>
                            <input
                                type="password"
                                value={pin}
                                onChange={handlePinChange}
                                className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold tracking-[0.5em] text-center text-xl shadow-inner dashed-placeholder"
                                placeholder="••••"
                                inputMode="numeric"
                                autoFocus
                                disabled={isLoading}
                                maxLength={4}
                            />
                        </div>

                        <button
                            onClick={() => verifyPin(pin)}
                            disabled={isLoading || pin.length < 4}
                            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" />
                                    Firmar y Autorizar
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper specific for the modal input style
const styles = `
.dashed-placeholder::placeholder {
    letter-spacing: 0.2em;
}
`;
