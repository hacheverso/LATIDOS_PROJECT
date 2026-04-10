"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InventoryError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Inventory Error:", error);
    }, [error]);

    const getUserMessage = (err: Error) => {
        const msg = err.message || "";
        if (msg.includes("digest") || msg.includes("Server Components") || msg.includes("omitted in production")) {
            return "Hubo un problema al cargar los datos de inventario. Esto puede ser un error temporal de conexión.";
        }
        if (/[áéíóúñ¿¡]/.test(msg) || msg.startsWith("Error") || msg.startsWith("No se") || msg.startsWith("Producto")) {
            return msg;
        }
        return "Error al procesar la operación de inventario. Verifica los datos e intenta de nuevo.";
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-primary uppercase tracking-tight">
                        Error en Inventario
                    </h2>
                    <p className="text-sm text-secondary mt-2 leading-relaxed">
                        {getUserMessage(error)}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 shadow-lg"
                    >
                        <RotateCw className="w-4 h-4" />
                        Reintentar
                    </button>
                    <Link
                        href="/inventory"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-muted rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 hover:text-primary transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a Inventario
                    </Link>
                </div>
                {error.digest && (
                    <p className="text-[10px] text-muted font-mono select-all pt-2 border-t border-border">
                        Ref: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
