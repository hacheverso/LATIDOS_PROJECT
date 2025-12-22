"use client";

import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BulkActionsBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
    children?: React.ReactNode;
}

export default function BulkActionsBar({ selectedCount, onClearSelection, onDelete, isDeleting, children }: BulkActionsBarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || selectedCount === 0) return null;

    return createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-2 pl-6 pr-3 flex items-center gap-6 border border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 w-2 h-2 rounded-full animate-pulse" />
                    <span className="font-bold text-sm tracking-wide">
                        {selectedCount} {selectedCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                    </span>
                </div>

                <div className="h-4 w-px bg-slate-700" />

                <div className="flex items-center gap-2">
                    {/* Extra actions passed as children */}
                    {children}

                    <div className="h-4 w-px bg-slate-700 mx-2" />

                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? "Eliminando..." : "Eliminar"}
                    </button>

                    <button
                        onClick={onClearSelection}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                        title="Cancelar selección"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
