"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export function InviteForm({ action }: { action: (formData: FormData) => void }) {
    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");

    const isValid = pass.length >= 6 && pass === confirm;

    return (
        <form action={action} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 ml-1">Nueva Contraseña</label>
                <div className="relative">
                    <input
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 ml-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                    <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Repite tu contraseña"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${confirm && pass !== confirm ? 'border-red-300 bg-red-50' : 'border-slate-300'
                            }`}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                </div>
                {confirm && pass !== confirm && (
                    <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-left-1 ml-1">
                        Las contraseñas no coinciden
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={!isValid}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 mt-4"
            >
                Confirmar Cuenta
            </button>
        </form>
    );
}
