"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm({ action }: { action: any }) {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setError(null);
        const res = await action(formData);
        if (res?.error) {
            setError(res.error);
        } else if (res?.success) {
            // Redirect to login with success flag instead of auto-login dashboard
            router.push("/login?setup=success");
            router.refresh();
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Nombre de la Organización</label>
                    <input
                        name="orgName"
                        type="text"
                        required
                        placeholder="Ej. Mi Tienda Principal"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-slate-800 mb-1">NIT / Identificación</label>
                    <input
                        name="nit"
                        type="text"
                        required
                        placeholder="Ej. 900123456"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm uppercase tracking-wide text-slate-600 font-black mb-3">Datos del Administrador</h3>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Nombre Completo</label>
                <input
                    name="adminName"
                    type="text"
                    required
                    placeholder="Tu Nombre Completo"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Correo Electrónico</label>
                <input
                    name="email"
                    type="email"
                    required
                    placeholder="admin@latidos.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Contraseña</label>
                <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-bold">
                    {error}
                </div>
            )}

            <SubmitButton />
        </form>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200 mt-4"
        >
            {pending ? "Configurando Sistema..." : "FINALIZAR CONFIGURACIÓN"}
        </button>
    );
}
