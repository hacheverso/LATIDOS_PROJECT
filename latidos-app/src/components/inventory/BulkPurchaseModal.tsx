"use client";

import { useState } from "react";
import { FileUp, X, Check, AlertCircle, Loader2, DollarSign } from "lucide-react";
import { bulkCreatePurchase } from "@/app/inventory/actions";
import { useRouter } from "next/navigation";

export default function BulkPurchaseModal({ onClose }: { onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; processedCount?: number; skippedCount?: number; errors: string[] } | null>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await bulkCreatePurchase(formData);
            setResult(res);
            // Only close automatically if everything was perfect (no skips, no errors)
            if (res.success && res.errors && res.errors.length === 0 && (res.skippedCount === 0 || res.skippedCount === undefined)) {
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 2500);
            } else {
                // Refresh anyway to show partial updates
                router.refresh();
            }
        } catch (e) {
            alert("Error al subir archivo");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Importar Compra Masiva
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-red-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!result ? (
                        <>
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full group-hover:scale-110 transition-transform">
                                    <FileUp className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-900 uppercase text-sm">
                                        {file ? file.name : "Click para seleccionar CSV"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">Formato: UPC, SKU, Cantidad, Costo Unitario</p>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-wider hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    "Procesar Compra"
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-6 text-center">
                            {result.success ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className={`p-4 rounded-full animate-bounce ${result.errors.length > 0 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                                            {result.errors.length > 0 ? <AlertCircle className="w-8 h-8" /> : <Check className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 uppercase">
                                                {result.errors.length > 0 ? "Proceso Finalizado" : "¡Compra Registrada!"}
                                            </h4>
                                            <p className="text-slate-800 text-sm font-medium mt-2 leading-relaxed">
                                                Compra Registrada: <span className="font-bold text-slate-900">{result.processedCount}</span> productos actualizados.
                                                <br />
                                                <span className="text-slate-500">
                                                    <span className="font-bold text-slate-900">{result.skippedCount || 0}</span> códigos fueron omitidos por no estar registrados en el catálogo.
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Show errors if any format errors occurred */}
                                    {result.errors.length > 0 && (
                                        <div className="bg-orange-50 rounded-xl p-4 text-left max-h-40 overflow-y-auto border border-orange-100">
                                            <p className="text-xs font-bold text-orange-900 mb-2 uppercase">Errores de Formato:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                {result.errors.map((err, i) => (
                                                    <li key={i} className="text-xs font-bold text-orange-800">{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-3 font-bold text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                                        >
                                            Cerrar
                                        </button>
                                        <button
                                            onClick={() => { setFile(null); setResult(null); }}
                                            className="flex-1 py-3 font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition-colors"
                                        >
                                            Nueva Carga
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Fatal Error State (Network or server crash logic)
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-2 text-red-500">
                                        <AlertCircle className="w-10 h-10" />
                                        <h4 className="font-black uppercase text-slate-900">Error Crítico</h4>
                                    </div>
                                    <p className="text-slate-600 font-medium">Ocurrió un error inesperado al procesar el archivo.</p>
                                    <button
                                        onClick={() => { setFile(null); setResult(null); }}
                                        className="w-full py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Intentar de nuevo
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
