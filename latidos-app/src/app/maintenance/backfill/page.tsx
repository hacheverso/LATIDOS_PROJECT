"use client";

import { useState } from "react";
import { runBackfill } from "./actions";

export default function BackfillPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        setLoading(true);
        const res = await runBackfill();
        setStatus(res);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full space-y-6">
                <h1 className="text-2xl font-black text-slate-800">Mantenimiento: Backfill de Datos</h1>
                <p className="text-sm text-slate-500">
                    Esta herramienta asignará todos los datos huérfanos (sin Organización) a una "Organización Principal" por defecto.
                    Úselo SOLO si está migrando una base de datos existente.
                </p>

                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <p className="text-yellow-800 font-bold text-xs uppercase tracking-wider">Advertencia</p>
                    <p className="text-yellow-700 text-sm mt-1">
                        Esto modificará masivamente la base de datos.
                    </p>
                </div>

                <button
                    onClick={handleRun}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? "Procesando..." : "EJECUTAR BACKFILL"}
                </button>

                {status && (
                    <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm font-mono overflow-auto max-h-64">
                        <pre>{JSON.stringify(status, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}
