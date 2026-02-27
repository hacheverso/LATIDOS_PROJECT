"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileUp, PackagePlus, Database } from "lucide-react";
import CsvUploadModal from "@/components/inventory/CsvUploadModal";
import BulkPurchaseModal from "@/components/inventory/BulkPurchaseModal";
import InitialBalanceModal from "@/components/inventory/InitialBalanceModal";

export default function InventoryHeaderActions() {
    const [showImport, setShowImport] = useState(false);
    const [showBulkPurchase, setShowBulkPurchase] = useState(false);
    const [showInitialBalance, setShowInitialBalance] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = async () => {
        try {
            const res = await fetch(`/api/inventory/export?t=${Date.now()}`);
            if (!res.ok) throw new Error("Error en el servidor al exportar");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Error al exportar: " + (err as Error).message);
        }
    };

    return (
        <div className="flex justify-end gap-3">
            {/* Export Button */}
            <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-muted font-bold uppercase text-xs hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-none"
            >
                <Download className="w-4 h-4" />
                Exportar CSV
            </button>

            {/* Actions Dropdown */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm dark:shadow-none ${menuOpen
                        ? 'bg-slate-900 dark:bg-white/10 text-white border-slate-900 dark:border-white/10'
                        : 'bg-surface border-border text-muted hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Acciones
                    <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-border p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <button
                            onClick={() => { setShowInitialBalance(true); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg group transition-colors mb-1"
                        >
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                                <Database className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-white uppercase">Carga Saldo Inicial</span>
                                <span className="block text-[10px] text-muted font-medium">Primer inventario (c/ historial)</span>
                            </div>
                        </button>

                        <div className="h-px bg-surface-hover my-1"></div>

                        <button
                            onClick={() => { setShowImport(true); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg group transition-colors"
                        >
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                <FileUp className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-white uppercase">Importar Catálogo</span>
                                <span className="block text-[10px] text-muted font-medium">Crear productos nuevos</span>
                            </div>
                        </button>

                        <button
                            onClick={() => { setShowBulkPurchase(true); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg group transition-colors"
                        >
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                                <PackagePlus className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-white uppercase">Importar Compra</span>
                                <span className="block text-[10px] text-muted font-medium">Carga masiva de stock</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {showImport && <CsvUploadModal onClose={() => setShowImport(false)} />}
            {showBulkPurchase && <BulkPurchaseModal onClose={() => setShowBulkPurchase(false)} />}
            {showInitialBalance && <InitialBalanceModal onClose={() => setShowInitialBalance(false)} />}
        </div>
    );
}
