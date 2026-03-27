import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Camera, Image as ImageIcon, Eraser, PenLine, X } from "lucide-react";
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
    const { resolvedTheme } = useTheme();
    const [loading, setLoading] = useState(false);

    // Photo Evidence State
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Signature State
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [hasSignature, setHasSignature] = useState(false);
    const [signatureOverlayOpen, setSignatureOverlayOpen] = useState(false);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    const [deliveryNote, setDeliveryNote] = useState("");

    // Pen color based on theme
    const penColor = resolvedTheme === 'dark' ? '#ffffff' : '#000000';

    // Canvas dimensions state
    const [canvasDims, setCanvasDims] = useState({ width: 300, height: 300 });

    // Calculate canvas dimensions when overlay opens
    useEffect(() => {
        if (signatureOverlayOpen) {
            const updateDims = () => {
                const headerH = 56; // header height
                const footerH = 73; // footer height
                setCanvasDims({
                    width: window.innerWidth,
                    height: window.innerHeight - headerH - footerH
                });
            };
            // Small delay for portal to mount
            const timer = setTimeout(updateDims, 50);
            window.addEventListener('resize', updateDims);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateDims);
            };
        }
    }, [signatureOverlayOpen]);

    const handleOpenSignature = () => {
        setSignatureOverlayOpen(true);
    };

    const handleConfirmSignature = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            setHasSignature(true);
            // Generate a preview thumbnail with white background for storage
            const trimmed = sigCanvas.current.getTrimmedCanvas();
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = trimmed.width + 20;
            thumbCanvas.height = trimmed.height + 20;
            const ctx = thumbCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
                ctx.drawImage(trimmed, 10, 10);
            }
            setSignaturePreview(thumbCanvas.toDataURL('image/png'));
        } else {
            setHasSignature(false);
            setSignaturePreview(null);
        }
        setSignatureOverlayOpen(false);
    };

    const handleClearSignature = () => {
        sigCanvas.current?.clear();
        setHasSignature(false);
        setSignaturePreview(null);
    };

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

            if (signaturePreview) {
                // signaturePreview already has white background from handleConfirmSignature
                signatureBase64 = signaturePreview;
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
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card text-primary border-border shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-6 h-6" />
                        Finalizar Entrega
                    </DialogTitle>
                    <DialogDescription className="text-secondary">
                        Sube la evidencia de entrega y firma para cerrar el pedido.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4 overflow-y-auto px-1 scrollbar-thin">
                    {/* Evidence Upload Section */}
                    <div className="bg-header p-4 rounded-lg border border-border">
                        <Label className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
                            Foto de Evidencia / Guía
                            {previewUrl && <CheckCircle2 className="w-4 h-4 text-success" />}
                            {!previewUrl && <span className="text-xs text-secondary font-normal ml-1">(Opcional)</span>}
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
                                    className="flex-1 bg-card border-border hover:bg-hover flex items-center justify-center gap-2 text-primary font-medium"
                                    onClick={() => document.getElementById('camera-input')?.click()}
                                >
                                    <Camera className="w-4 h-4" /> Tomar Foto
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-card border-border hover:bg-hover flex items-center justify-center gap-2 text-primary font-medium"
                                    onClick={() => document.getElementById('file-input')?.click()}
                                >
                                    <ImageIcon className="w-4 h-4" /> Subir Archivo
                                </Button>
                            </div>

                            {previewUrl && (
                                <div className="mt-2 relative rounded-lg overflow-hidden border border-border aspect-video bg-gray-100">
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
                    <div className="bg-header p-4 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-1">
                            <Label className="flex items-center gap-2 text-sm font-bold text-primary">
                                Firma del Cliente
                                {hasSignature && <CheckCircle2 className="w-4 h-4 text-success" />}
                            </Label>
                            {hasSignature && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearSignature}
                                    className="h-6 px-2 text-xs text-secondary hover:text-primary"
                                >
                                    <Eraser className="w-3 h-3 mr-1" /> Limpiar
                                </Button>
                            )}
                        </div>

                        {signaturePreview ? (
                            <div className="mt-2 space-y-2">
                                <div className="border border-border rounded-lg overflow-hidden bg-white p-2">
                                    <img src={signaturePreview} alt="Firma" className="w-full h-20 object-contain" />
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full bg-card border-border hover:bg-hover text-primary font-medium text-xs"
                                    onClick={handleOpenSignature}
                                >
                                    <PenLine className="w-4 h-4 mr-2" /> Firmar de Nuevo
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <p className="text-xs text-secondary mb-3 italic">Pida al cliente que firme para confirmar la recepción.</p>
                                <Button
                                    variant="outline"
                                    className="w-full bg-card border-border hover:bg-hover text-primary font-bold py-6 text-sm"
                                    onClick={handleOpenSignature}
                                >
                                    <PenLine className="w-5 h-5 mr-2" /> Firmar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Observations Section */}
                    <div className="bg-header p-4 rounded-lg border border-border">
                        <Label className="text-sm font-bold text-primary mb-2 block">Observaciones de Entrega (Opcional)</Label>
                        <Textarea
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            placeholder="Ej: Recibido por el portero..."
                            className="resize-none bg-card text-sm"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 pt-2 border-t border-border">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-card text-primary border-border hover:bg-hover hover:text-primary w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleInitiateFinalize}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto"
                    >
                        {loading ? "Procesando..." : "Confirmar Entrega"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Fullscreen Signature Overlay — rendered via portal at body level to sit above Radix Dialog portal */}
        {signatureOverlayOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0a0a0a]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Firma del Cliente</h2>
                    <button
                        onClick={() => setSignatureOverlayOpen(false)}
                        className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative overflow-hidden" style={{ touchAction: 'none' }}>
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor={penColor}
                        backgroundColor="transparent"
                        canvasProps={{
                            width: canvasDims.width,
                            height: canvasDims.height,
                            style: { width: canvasDims.width, height: canvasDims.height, touchAction: 'none' }
                        }}
                        onEnd={() => setHasSignature(true)}
                    />
                    {/* Guide line */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute bottom-[30%] left-8 right-8 border-b border-dashed border-slate-300 dark:border-white/20" />
                    </div>
                    <p className="absolute bottom-[31%] left-8 text-[10px] text-slate-400 dark:text-white/30 font-medium uppercase tracking-wider pointer-events-none">Firme aquí</p>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/10 shrink-0">
                    <Button
                        variant="outline"
                        className="flex-1 bg-transparent border-slate-300 dark:border-white/20 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 font-bold"
                        onClick={() => {
                            sigCanvas.current?.clear();
                        }}
                    >
                        <Eraser className="w-4 h-4 mr-2" /> Limpiar
                    </Button>
                    <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20"
                        onClick={handleConfirmSignature}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Firma
                    </Button>
                </div>
            </div>
        , document.body)}
        </>
    );
}
