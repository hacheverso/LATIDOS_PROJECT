"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileUp, PackagePlus, Database } from "lucide-react";
import SmartImportWizard from "@/components/inventory/SmartImportWizard";
import { useTranslations } from "next-intl";

type ImportMode = "catalog" | "purchase" | "initial_balance";

export default function InventoryHeaderActions() {
    const [activeImport, setActiveImport] = useState<ImportMode | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const t = useTranslations("InventoryHeader");

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
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-secondary font-bold uppercase text-xs hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary dark:hover:text-white transition-all shadow-sm dark:shadow-none"
            >
                <Download className="w-4 h-4" />
                {t("export_csv")}
            </button>

            {/* Actions Dropdown */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm dark:shadow-none ${menuOpen
                        ? 'bg-slate-800 dark:bg-slate-800 text-white border-slate-700 dark:border-slate-700'
                        : 'bg-card border-border text-secondary hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary dark:hover:text-white'
                        }`}
                >
                    {t("actions")}
                    <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-xl border border-border p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <button
                            onClick={() => { setActiveImport("initial_balance"); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg group transition-colors mb-1"
                        >
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                                <Database className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-primary uppercase">{t("initial_balance_load")}</span>
                                <span className="block text-[10px] text-muted font-medium">{t("initial_balance_desc")}</span>
                            </div>
                        </button>

                        <div className="h-px bg-card-hover my-1"></div>

                        <button
                            onClick={() => { setActiveImport("catalog"); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg group transition-colors"
                        >
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-transfer rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                <FileUp className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-primary uppercase">{t("import_catalog")}</span>
                                <span className="block text-[10px] text-muted font-medium">{t("import_catalog_desc")}</span>
                            </div>
                        </button>

                        <button
                            onClick={() => { setActiveImport("purchase"); setMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg group transition-colors"
                        >
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-success rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/15 transition-colors">
                                <PackagePlus className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-primary uppercase">{t("import_purchase")}</span>
                                <span className="block text-[10px] text-muted font-medium">{t("import_purchase_desc")}</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {activeImport && (
                <SmartImportWizard
                    mode={activeImport}
                    onClose={() => setActiveImport(null)}
                />
            )}
        </div>
    );
}
