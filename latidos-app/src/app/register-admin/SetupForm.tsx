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
            router.push("/"); // Redirect to dashboard on success
            router.refresh(); // Refresh to catch session
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Organización</label>
                <input
                    name="orgName"
                    type="text"
                    required
                    placeholder="Ej. Mi Tienda Principal"
                    className="w-full rounded-xl border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Administrador</label>
                <input
                    name="adminName"
                    type="text"
                    required
                    placeholder="Tu Nombre Completo"
                    className="w-full rounded-xl border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                    name="email"
                    type="email"
                    required
                    placeholder="admin@latidos.com"
                    className="w-full rounded-xl border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                <input
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-xl border-slate-300 focus:ring-blue-500 focus:border-blue-500"
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
            {pending ? "Configurando Sistema..." : "CREAR CUENTA & INICIAR"}
        </button>
    );
}
