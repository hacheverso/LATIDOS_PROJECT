"use client";

import { useState } from "react";
import { Shield, Key, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { setUserPassword } from "../actions";

export function ProfileSecurity({ hasPassword }: { hasPassword: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirm = formData.get("confirm") as string;

        if (password !== confirm) {
            toast.error("Las contraseñas no coinciden");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            setIsLoading(false);
            return;
        }

        try {
            await setUserPassword(password);
            toast.success("Contraseña actualizada exitosamente");
            setIsOpen(false);
            // Optionally reload page or update state to reflect hasPassword = true
            // Ideally we'd optimize this with robust state management, but for now a reload ensures server state sync
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar contraseña");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Key className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Seguridad de Acceso</h3>
                        <p className="text-sm text-slate-500 font-medium">
                            {hasPassword
                                ? "Tu cuenta está protegida con contraseña."
                                : "No tienes contraseña (Solo Google)."}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsOpen(true)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${hasPassword
                        ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:shadow-md"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30"
                        }`}
                >
                    {hasPassword ? "Cambiar Contraseña" : "Establecer Contraseña"}
                    {!hasPassword && <CheckCircle className="w-4 h-4" />}
                </button>
            </div>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">
                                    {hasPassword ? "Cambiar Contraseña" : "Crear Contraseña"}
                                </h3>
                                <p className="text-slate-500 font-medium mt-1">
                                    {hasPassword
                                        ? "Ingresa tu nueva contraseña para actualizarla."
                                        : "Crea una contraseña para entrar sin Google."}
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-0 font-bold transition-all bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    name="confirm"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-0 font-bold transition-all bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <SaveIcon className="w-4 h-4" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function SaveIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    )
}
