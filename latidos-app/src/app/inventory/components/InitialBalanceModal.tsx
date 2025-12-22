"use client";

import { useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { loadInitialBalance } from "../actions";

export default function InitialBalanceModal({ onClose }: { onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; errors: string[]; count?: number } | null>(null);

    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.csv')) {
                setFile(droppedFile);
                setResult(null);
            } else {
                setResult({ success: false, errors: ["Por favor, sube un archivo CSV válido."] });
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await loadInitialBalance(formData);
            setResult(res);
            if (res.success && res.errors.length === 0) {
                setTimeout(onClose, 2000); // Auto close on success
            }
        } catch (_error) {
            setResult({ success: false, errors: ["Error de conexión o servidor."] });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6" />
                        Carga de Saldo Inicial
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-sm text-slate-500">
                        Sube un archivo CSV con las columnas: <br />
                        <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600 font-mono text-xs">upc, sku, name, stock, cost</code>
                    </p>

                    {/* File Drop Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            border-2 border-dashed rounded-xl p-8 text-center transition-all group
                            ${isDragging ? "border-amber-500 bg-amber-50 scale-105" : "border-slate-200 hover:border-amber-500 hover:bg-amber-50"}
                        `}
                    >
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="balance-file"
                        />
                        <label htmlFor="balance-file" className="cursor-pointer block">
                            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3 group-hover:text-amber-500 transition-colors" />
                            <span className="text-sm font-bold text-slate-600 block mb-1">
                                {file ? file.name : "Click para seleccionar archivo"}
                            </span>
                            <span className="text-xs text-slate-400">Formato CSV (.csv)</span>
                        </label>
                    </div>

                    {/* Feedback */}
                    {result && (
                        <div className={`p-4 rounded-xl text-xs font-medium space-y-2 ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            <div className="flex items-center gap-2 font-bold text-sm">
                                {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {result.success ? `Proceso Completado (+${result.count} Unidades)` : "Errores Encontrados"}
                            </div>
                            {result.errors.length > 0 && (
                                <ul className="list-disc list-inside space-y-1 opacity-80">
                                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                                    {result.errors.length > 5 && <li>... y {result.errors.length - 5} más</li>}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleUpload}
                            disabled={!file || isLoading}
                            className={`
                                px-6 py-3 rounded-xl text-white font-black text-xs uppercase tracking-wide transition-all shadow-lg
                                ${!file || isLoading ? "bg-slate-300 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/30 hover:-translate-y-0.5"}
                            `}
                        >
                            {isLoading ? "Procesando Balance..." : "Cargar Saldo"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
