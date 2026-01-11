"use client";

import { useFormState, useFormStatus } from "react-dom";
import { authenticate, loginWithGoogle } from "@/app/lib/actions";
import { Package } from "lucide-react";

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-3xl shadow-xl border border-slate-100">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">LATIDOS</h2>
                    <p className="text-slate-500 font-medium">Inicia sesión en tu cuenta</p>
                </div>

                <div className="space-y-3">
                    {/* Google Login */}
                    <form action={loginWithGoogle}>
                        <button className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                            <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#4285F4" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#34A853" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#FBBC05" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#EA4335" }}
                                />
                            </svg>
                            Continuar con Google
                        </button>
                    </form>

                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">O con correo</span>
                    </div>
                </div>

                <form action={dispatch} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 ml-1" htmlFor="email">
                            Correo Electrónico
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold focus:border-slate-900 focus:ring-0 transition-all bg-white"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 ml-1" htmlFor="password">
                            Contraseña
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold focus:border-slate-900 focus:ring-0 transition-all bg-white"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <LoginButton />

                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-bold text-center">
                            {errorMessage}
                        </div>
                    )}
                </form>

                <div className="text-center text-xs text-slate-400 font-medium">
                    &copy; 2025 Hacheverso. Sistema LATIDOS v1.0
                </div>
            </div>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            aria-disabled={pending}
        >
            {pending ? "Entrando..." : "Ingresar"}
        </button>
    );
}
