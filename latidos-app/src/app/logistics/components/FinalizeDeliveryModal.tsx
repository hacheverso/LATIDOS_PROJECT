"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Camera } from "lucide-react";
import { markAsDelivered } from "../actions";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";
import { Textarea } from "@/components/ui/textarea";

interface FinalizeDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any; // BoardItem
}

export default function FinalizeDeliveryModal({ isOpen, onClose, item }: FinalizeDeliveryModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [deliveryNote, setDeliveryNote] = useState("");

    const [showPinModal, setShowPinModal] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            setPreviewUrl(URL.createObjectURL(file));

            // Compression
            try {
                const options = {
                    maxSizeMB: 0.2, // Aim for ~200KB
                    maxWidthOrHeight: 1024,
                    useWebWorker: true,
                    initialQuality: 0.6
                };

                toast.info("Comprimiendo imagen...", { duration: 2000 });
                const compressedFile = await imageCompression(file, options);

                setEvidenceFile(compressedFile);
                toast.success(`Imagen optimizada: ${(compressedFile.size / 1024).toFixed(0)} KB`);
            } catch (error) {
                console.error(error);
                toast.error("Error al comprimir imagen, se usará original.");
                setEvidenceFile(file);
            }
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // 1. First step: Validate Photo -> Open PIN Modal
    const handleInitiateFinalize = () => {
        if (!evidenceFile) {
            toast.error("Debes adjuntar una foto de evidencia (Firma/Paquete).");
            return;
        }
        setShowPinModal(true);
    };

    // 2. Second step: Authorized via PIN
    const handleSignatureSuccess = async (signer: any, pin: string) => {
        setShowPinModal(false);
        setLoading(true);

        try {
            if (!evidenceFile) return;
            // Convert to Base64 for storage (since we don't have S3 configured)
            // The compression ensures this is small enough (<200KB) for the DB text field.
            const base64Image = await fileToBase64(evidenceFile);

            // Call Action with PIN
            const result = await markAsDelivered(item.id, item.type, base64Image, pin, deliveryNote);

            if (result.success) {
                toast.success(`Entrega cerrada por: ${signer.name}`);
                router.refresh();
                onClose();
            } else {
                toast.error(`Error: ${result.error || "No se pudo finalizar"}`);
            }
        } catch (error) {
            console.error(error);
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
                        Sube la evidencia de entrega y firma para cerrar el pedido.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Evidence Upload Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="text-sm font-bold text-slate-700 mb-2 block">
                            Foto de Evidencia / Guía Firmada *
                        </Label>

                        <div className="flex flex-col gap-3">
                            <Input
                                type="file"
                                accept="image/*"
                                capture="environment" // Mobile camera hint
                                onChange={handleFileChange}
                                className="bg-white"
                            />

                            {/* Optional Note */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-500">Observaciones de Entrega (Opcional)</Label>
                                <Textarea
                                    value={deliveryNote}
                                    onChange={(e) => setDeliveryNote(e.target.value)}
                                    placeholder="Ej: Recibido por..."
                                    className="resize-none bg-white text-sm"
                                    rows={2}
                                />
                            </div>

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
                        onClick={handleInitiateFinalize}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                        {loading ? "Procesando..." : "Firmar y Finalizar"}
                    </Button>
                </DialogFooter>

                {/* PIN Signature Modal Layered */}
                <PinSignatureModal
                    isOpen={showPinModal}
                    onClose={() => setShowPinModal(false)}
                    onSuccess={handleSignatureSuccess}
                    actionName="Confirmar Entrega"
                />
            </DialogContent>
        </Dialog>
    );
}
