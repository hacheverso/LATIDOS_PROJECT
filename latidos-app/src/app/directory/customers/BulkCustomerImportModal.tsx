"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { bulkCreateCustomers } from "../../sales/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BulkCustomerImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BulkCustomerImportModal({ isOpen, onClose }: BulkCustomerImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResults(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setResults(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await bulkCreateCustomers(formData);

            setResults({
                success: res.count || 0,
                errors: res.errors || []
            });

            if (res.success && (!res.errors || res.errors.length === 0)) {
                toast.success(`Se importaron ${res.count} clientes exitosamente.`);
                router.refresh();
                setTimeout(onClose, 2000);
            } else if (res.count && res.count > 0) {
                toast.warning(`Se importaron ${res.count} clientes, pero hubo algunos errores.`);
                router.refresh();
            } else {
                toast.error("No se pudo importar ningún cliente.");
            }

        } catch (error) {
            toast.error((error as Error).message || "Error al subir el archivo");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResults(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-slate-50 z-[100]">
                <DialogHeader className="p-6 bg-white border-b border-slate-100">
                    <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                        Importación Masiva de Clientes
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium mt-2">
                        Sube un archivo CSV o Excel (guardado como CSV/TSV) desde tu sistema anterior (ej. Holded) para crear múltiples clientes a la vez.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Instructions */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                        <AlertCircle className="w-5 h-5 text-blue-500 flex-none mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">Estructura requerida del archivo:</p>
                            <p>El archivo de texto debe incluir columnas con nombres similares a:</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm">Nombre / Cliente</span>
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm">NIT / Documento</span>
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm opacity-60">Teléfono (Opc.)</span>
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm opacity-60">Correo (Opc.)</span>
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm opacity-60">Dirección (Opc.)</span>
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold border border-blue-100 shadow-sm opacity-60">Sector/Zona (Opc.)</span>
                            </div>
                        </div>
                    </div>

                    {/* File Upload Area */}
                    {!results && (
                        <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-blue-50/50 hover:border-blue-400 transition-colors bg-white block relative overflow-hidden group cursor-pointer w-full">
                            <input
                                type="file"
                                accept=".csv,.tsv,.txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                title="Haz clic o arrastra aquí tu archivo"
                            />
                            <div className="flex flex-col items-center relative z-10 pointer-events-none group-hover:scale-105 transition-transform">
                                <UploadCloud className="w-12 h-12 text-slate-400 mb-4 group-hover:text-blue-500 transition-colors" />
                                {file ? (
                                    <div className="text-slate-700 font-bold">
                                        {file.name}
                                        <p className="text-xs text-slate-500 font-normal mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-slate-700 font-bold mb-1 text-lg">Haz clic o arrastra tu archivo</span>
                                        <span className="text-slate-500 text-sm">Validado: (.csv, .tsv, Excel)</span>
                                    </>
                                )}
                            </div>
                        </label>
                    )}

                    {/* Results Area */}
                    {results && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black text-slate-800">{results.success} Clientes Importados</h3>
                                <p className="text-slate-500 mt-1">El proceso de lectura ha finalizado.</p>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                    <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                                        <AlertCircle className="w-4 h-4" />
                                        Se encontraron {results.errors.length} problemas:
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-red-700 font-mono pr-2 custom-scrollbar">
                                        {results.errors.map((err, i) => (
                                            <div key={i} className="bg-white/50 px-2 py-1 rounded">{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-white border-t border-slate-100 sm:justify-between px-6">
                    <Button variant="ghost" onClick={handleClose} disabled={isUploading} className="text-slate-500 font-bold">
                        {results ? "Cerrar" : "Cancelar"}
                    </Button>
                    {!results && (
                        <Button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-500/20"
                        >
                            {isUploading ? "Procesando Archivo..." : "Importar Clientes"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
