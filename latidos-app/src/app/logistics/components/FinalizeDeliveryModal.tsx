import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Camera, Image as ImageIcon, Eraser } from "lucide-react";
import { markAsDelivered } from "../actions";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from 'react-signature-canvas';

interface FinalizeDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any; // BoardItem
}

export default function FinalizeDeliveryModal({ isOpen, onClose, item }: FinalizeDeliveryModalProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    // Photo Evidence State
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Signature State
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [hasSignature, setHasSignature] = useState(false);

    const [deliveryNote, setDeliveryNote] = useState("");

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

    const combinePhotoAndSignature = async (photoBase64: string, signatureBase64: string): Promise<string> => {
        return new Promise((resolve) => {
            const imgPhoto = new Image();
            const imgSig = new Image();

            imgPhoto.onload = () => {
                imgSig.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    if (!ctx) {
                        resolve(photoBase64);
                        return;
                    }

                    // Set canvas width to the photo width, scaled signature
                    const targetWidth = Math.max(imgPhoto.width, imgSig.width, 600); // minimum width
                    const photoRatio = imgPhoto.width / imgPhoto.height;
                    const sigRatio = imgSig.width / imgSig.height;

                    const pWidth = targetWidth;
                    const pHeight = targetWidth / photoRatio;

                    // Pad the signature a bit
                    const sWidth = Math.min(targetWidth * 0.8, imgSig.width);
                    const sHeight = sWidth / sigRatio;

                    canvas.width = targetWidth;
                    canvas.height = pHeight + sHeight + 40; // 40px padding for signature area

                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw photo
                    ctx.drawImage(imgPhoto, 0, 0, pWidth, pHeight);
                    // Draw signature centered at bottom
                    const sigX = (targetWidth - sWidth) / 2;
                    ctx.drawImage(imgSig, sigX, pHeight + 20, sWidth, sHeight);

                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                imgSig.src = signatureBase64;
            };
            imgPhoto.src = photoBase64;
        });
    };

    const handleInitiateFinalize = async () => {
        const currentUser = session?.user;
        if (!currentUser) {
            toast.error("Error: Sesión no válida.");
            return;
        }

        setLoading(true);

        try {
            let photoBase64 = "";
            let signatureBase64 = "";
            let finalImageBase64 = "";

            if (evidenceFile) {
                photoBase64 = await fileToBase64(evidenceFile);
            }

            if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                // Get Signature as white background PNG for clarity
                signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
            }

            if (photoBase64 && signatureBase64) {
                finalImageBase64 = await combinePhotoAndSignature(photoBase64, signatureBase64);
            } else if (photoBase64) {
                finalImageBase64 = photoBase64;
            } else if (signatureBase64) {
                // If only signature, ensure it has white bg
                finalImageBase64 = await new Promise((resolve) => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                        canvas.width = img.width + 40; // Add padding
                        canvas.height = img.height + 40;
                        if (ctx) {
                            ctx.fillStyle = "white";
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 20, 20);
                        }
                        resolve(canvas.toDataURL("image/jpeg", 0.8));
                    };
                    img.src = signatureBase64;
                });
            }

            // Call Action with SELF_AUTH (since driver auth is removed)
            const result = await markAsDelivered(item.id, item.type, finalImageBase64, "SELF_AUTH", deliveryNote);

            if (result.success) {
                toast.success(`Entrega cerrada por: ${currentUser.name}`);
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
            <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-6 h-6" />
                        Finalizar Entrega
                    </DialogTitle>
                    <DialogDescription className="text-slate-600">
                        Sube la evidencia de entrega y firma para cerrar el pedido.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4 overflow-y-auto px-1 scrollbar-thin">
                    {/* Evidence Upload Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            Foto de Evidencia / Guía
                            {previewUrl && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {!previewUrl && <span className="text-xs text-slate-400 font-normal ml-1">(Opcional)</span>}
                        </Label>

                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2 w-full">
                                {/* Hidden file inputs */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="camera-input"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-input"
                                />
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-white border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 text-slate-700 font-medium"
                                    onClick={() => document.getElementById('camera-input')?.click()}
                                >
                                    <Camera className="w-4 h-4" /> Tomar Foto
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-white border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 text-slate-700 font-medium"
                                    onClick={() => document.getElementById('file-input')?.click()}
                                >
                                    <ImageIcon className="w-4 h-4" /> Subir Archivo
                                </Button>
                            </div>

                            {previewUrl && (
                                <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-gray-100">
                                    <img
                                        src={previewUrl}
                                        alt="Evidencia"
                                        className="w-full h-full object-cover"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2 w-8 h-8 p-0 shrink-0"
                                        onClick={() => { setPreviewUrl(null); setEvidenceFile(null); }}
                                    >
                                        x
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer Signature Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                            <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                Firma del Cliente
                                {hasSignature && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    sigCanvas.current?.clear();
                                    setHasSignature(false);
                                }}
                                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800"
                            >
                                <Eraser className="w-3 h-3 mr-1" /> Limpiar
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 italic">Pida al cliente que firme aquí para confirmar la recepción.</p>

                        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white touch-none">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: "w-full h-40 signature-canvas"
                                }}
                                onEnd={() => setHasSignature(true)}
                            />
                        </div>
                    </div>

                    {/* Observations Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="text-sm font-bold text-slate-700 mb-2 block">Observaciones de Entrega (Opcional)</Label>
                        <Textarea
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            placeholder="Ej: Recibido por el portero..."
                            className="resize-none bg-white text-sm"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 pt-2 border-t border-slate-100">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleInitiateFinalize}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto"
                    >
                        {loading ? "Procesando..." : "Firmar y Finalizar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
