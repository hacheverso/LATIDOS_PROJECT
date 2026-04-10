"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App Error:", error);
    }, [error]);

    // Derive a user-friendly message from the error
    const getUserMessage = (err: Error) => {
        const msg = err.message || "";

        // If it's the generic Next.js production message, show a friendly alternative
        if (msg.includes("digest") || msg.includes("Server Components") || msg.includes("omitted in production")) {
            return "Ocurrió un error inesperado en el servidor. Esto puede ser temporal.";
        }

        // If the message is already user-friendly (Spanish), use it
        if (/[áéíóúñ¿¡]/.test(msg) || msg.startsWith("Error") || msg.startsWith("No se")) {
            return msg;
        }

        // Generic fallback
        return "Algo salió mal. Por favor intenta de nuevo.";
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                </div>

                {/* Title */}
                <div>
                    <h2 className="text-xl font-black text-primary uppercase tracking-tight">
                        ¡Ups! Algo salió mal
                    </h2>
                    <p className="text-sm text-secondary mt-2 leading-relaxed">
                        {getUserMessage(error)}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 shadow-lg"
                    >
                        <RotateCw className="w-4 h-4" />
                        Intentar de Nuevo
                    </button>
                    <a
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-muted rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 hover:text-primary transition-all active:scale-95"
                    >
                        <Home className="w-4 h-4" />
                        Ir al Inicio
                    </a>
                </div>

                {/* Digest for support */}
                {error.digest && (
                    <p className="text-[10px] text-muted font-mono select-all pt-2 border-t border-border">
                        Ref: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
