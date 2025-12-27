"use client";

import { useFormState, useFormStatus } from "react-dom";
import { authenticate } from "@/app/lib/actions"; // We need to create this action
import { Package } from "lucide-react";

export default function LoginPage() {
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
