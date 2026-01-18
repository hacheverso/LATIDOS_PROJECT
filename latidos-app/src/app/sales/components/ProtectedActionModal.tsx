"use client";

import { useState } from "react";
import { X, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { verifyPin } from "@/app/sales/actions";

interface ProtectedActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (adminUser: { name: string; role: string }, pin: string) => void;
    title?: string;
    description?: string;
}

export default function ProtectedActionModal({ isOpen, onClose, onSuccess, title = "Acceso Protegido", description = "Esta acción requiere autorización de administrador." }: ProtectedActionModalProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            setError("El PIN debe tener al menos 4 dígitos");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const user = await verifyPin(pin);
            if (user) {
                if ((user.role as string) !== "ADMIN" && (user.role as string) !== "SUPERADMIN" && (user.role as string) !== "OPERATOR") {
                    setError("Este usuario no tiene permisos para realizar esta acción.");
                } else {
                    onSuccess(user, pin);
                    onClose();
                }
            } else {
                setError("PIN incorrecto o usuario no encontrado.");
            }
        } catch (err) {
            console.error(err);
            setError("Error al verificar credenciales.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-xl">
                            <Lock className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{title}</h3>
                            <p className="text-xs text-slate-500 font-medium">{description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleVerify} className="p-8 space-y-6">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">
                            Ingrese su PIN de seguridad para confirmar esta operación irreversible.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">
                            PIN de Seguridad
                        </label>
                        <input
                            autoFocus
                            type="password"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError("");
                            }}
                            className="w-full text-center text-3xl font-black tracking-[0.5em] p-4 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-slate-800 placeholder:text-slate-300"
                            placeholder="••••"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || pin.length < 4}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            "Autorizar Acción"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
