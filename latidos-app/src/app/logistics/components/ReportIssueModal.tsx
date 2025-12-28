"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Undo2 } from "lucide-react";
import { reportDeliveryIssue } from "../actions";
import { toast } from "sonner";
import { BoardItem } from "../actions";

interface ReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: BoardItem;
}

export default function ReportIssueModal({ isOpen, onClose, item }: ReportIssueModalProps) {
    const [loading, setLoading] = useState(false);
    const [comment, setComment] = useState("");
    const [isCancellation, setIsCancellation] = useState(false);

    const handleReport = async () => {
        if (!comment.trim()) {
            toast.error("Por favor ingresa un comentario sobre la novedad");
            return;
        }

        setLoading(true);
        try {
            const action = isCancellation ? "CANCEL" : "COMMENT";
            const result = await reportDeliveryIssue(item.id, item.type, comment, action);

            if (result.success) {
                toast.success(isCancellation ? "Entrega cancelada y devuelta a pendientes" : "Novedad registrada");
                onClose();
                setComment("");
                setIsCancellation(false);
            } else {
                toast.error(result.error || "Error al reportar");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${isCancellation ? "text-red-600" : "text-amber-600"}`}>
                        <AlertTriangle className="w-6 h-6" />
                        {isCancellation ? "Reportar Entrega Fallida" : "Reportar Novedad"}
                    </DialogTitle>
                    <DialogDescription>
                        {isCancellation
                            ? "Al cancelar, la entrega volverá a la columna 'Pendientes' y se desasignará del conductor."
                            : "Añade una nota o comentario a esta entrega. No afectará su estado."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Descripción de la Novedad</Label>
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={isCancellation ? "Razón de la cancelación (ej: Cliente ausente, Dirección errónea)..." : "Ej: Cliente pide entregar en portería..."}
                            className="resize-none h-24"
                        />
                    </div>

                    <div className="flex items-center space-x-2 bg-red-50 p-3 rounded-lg border border-red-100">
                        <input
                            type="checkbox"
                            id="cancelDelivery"
                            checked={isCancellation}
                            onChange={(e) => setIsCancellation(e.target.checked)}
                            className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500 accent-red-600"
                        />
                        <Label htmlFor="cancelDelivery" className="text-sm font-medium text-red-800 leading-none cursor-pointer">
                            Cancelar Entrega (Devolver a Pendientes)
                        </Label>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cerrar
                    </Button>
                    <Button
                        onClick={handleReport}
                        disabled={loading}
                        className={isCancellation ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}
                    >
                        {loading ? "Procesando..." : isCancellation ? "Confirmar Cancelación" : "Registrar Nota"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
