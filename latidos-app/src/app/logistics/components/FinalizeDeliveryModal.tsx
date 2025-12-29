"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Camera } from "lucide-react";
import { markAsDelivered } from "../actions";
import { toast } from "sonner";

interface FinalizeDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any; // BoardItem
}

export default function FinalizeDeliveryModal({ isOpen, onClose, item }: FinalizeDeliveryModalProps) {
    const [loading, setLoading] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEvidenceFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleFinalize = async () => {
        if (!evidenceFile) {
            toast.error("Debes adjuntar una foto de evidencia.");
            return;
        }

        setLoading(true);
        try {
            // Simulate Upload (In real production, upload to S3 here)
            // For now, we'll store a mock URL or we could assume the backend handles the file (but server actions are strict with FormData)
            // Let's assume we get a URL back from an upload service.
            // MOCK:
            const mockEvidenceUrl = `https://storage.latidos.com/${item.id}_${Date.now()}.jpg`;
            console.log("Mock Uploading...", evidenceFile.name);

            const result = await markAsDelivered(item.id, item.type, mockEvidenceUrl);

            if (result.success) {
                toast.success("Entrega finalizada y evidencia guardada.");
                onClose();
            } else {
                toast.error(`Error: ${result.error || "No se pudo finalizar"}`);
            }
        } catch (error) {
            toast.error("Error inesperado al conectar con servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-6 h-6" />
                        Finalizar Entrega
                    </DialogTitle>
                    <DialogDescription className="text-slate-600">
                        ¿Confirmas que el pedido fue entregado con éxito?
                        Esta acción moverá la tarjeta al historial y notificará el cierre.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Evidence Upload Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="text-sm font-bold text-slate-700 mb-2 block">
                            Foto de Evidencia (Obligatorio)
                        </Label>

                        <div className="flex flex-col gap-3">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="bg-white"
                            />

                            {previewUrl && (
                                <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-gray-100">
                                    <img
                                        src={previewUrl}
                                        alt="Evidencia"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {!previewUrl && (
                                <div className="text-xs text-slate-400 italic">
                                    <p>Sube una foto de la entrega o guía firmada.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleFinalize}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {loading ? "Finalizando..." : "Confirmar Entrega"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
