"use client";

import { useState } from "react";
import { FileUp, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { bulkCreateProducts } from "@/app/inventory/actions";
import { useRouter } from "next/navigation";

export default function CsvUploadModal({ onClose }: { onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; errors: string[] } | null>(null);
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
            const res = await bulkCreateProducts(formData);
            setResult(res);
            if (res.errors.length === 0) {
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 1500);
            }
        } catch (_e) {
            alert("Error al subir archivo");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-blue-600" />
                        Importación Masiva
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!result ? (
                        <>
                            <label className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all group cursor-pointer relative block w-full overflow-hidden">
                                <input
                                    type="file"
                                    accept=".csv, .tsv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                    title="Haz clic o arrastra aquí tu archivo"
                                />
                                <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform relative z-10 pointer-events-none">
                                    <FileUp className="w-8 h-8" />
                                </div>
                                <div className="text-center relative z-10 pointer-events-none">
                                    <p className="font-bold text-slate-700 uppercase text-sm">
                                        {file ? file.name : "Click para seleccionar o arrastrar CSV/Excel"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Formato: Nombre, Categoría, Estado, UPC, SKU, ImageURL</p>
                                </div>
                            </label>

                            <button
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-wider hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    "Subir y Procesar"
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-6 text-center">
                            {result.errors.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <div className="p-4 bg-green-100 text-green-600 rounded-full">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase">¡Importación Exitosa!</h4>
                                    <p className="text-slate-500 text-sm font-medium">Todos los productos has sido creados correctamente.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-2 text-orange-500">
                                        <AlertCircle className="w-10 h-10" />
                                        <h4 className="font-black uppercase">Importación Parcial</h4>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-4 text-left max-h-40 overflow-y-auto border border-orange-100">
                                        <ul className="list-disc pl-4 space-y-1">
                                            {result.errors.map((err, i) => (
                                                <li key={i} className="text-xs font-bold text-orange-800">{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={() => { setFile(null); setResult(null); }}
                                        className="text-sm font-bold text-slate-500 hover:text-slate-800 underline"
                                    >
                                        Intentar con otro archivo
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
