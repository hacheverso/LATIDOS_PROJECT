"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, DollarSign } from "lucide-react";
import { markAsDelivered } from "../actions";
import { toast } from "sonner";

interface FinalizeDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any; // BoardItem
}

export default function FinalizeDeliveryModal({ isOpen, onClose, item }: FinalizeDeliveryModalProps) {
    const [loading, setLoading] = useState(false);
    const [amountCollected, setAmountCollected] = useState<string>(item.moneyToCollect > 0 ? item.moneyToCollect.toString() : "");
    const [confirmPayment, setConfirmPayment] = useState(false);

    const handleFinalize = async () => {
        console.log("Button clicked: Finalizar Entrega");
        setLoading(true);
        try {
            const collected = confirmPayment && amountCollected ? parseFloat(amountCollected) : 0;
            console.log(`Calling markAsDelivered: ID=${item.id}, Type=${item.type}, Collected=${collected}`);

            const result = await markAsDelivered(item.id, item.type, collected);
            console.log("Server Result:", result);

            if (result.success) {
                toast.success("Entrega finalizada correctamente");
                onClose();
            } else {
                console.error("Server Error:", result.error);
                toast.error(`Error: ${result.error || "No se pudo finalizar"}`);
            }
        } catch (error) {
            console.error("Client Catch:", error);
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
                    {/* Payment Confirmation Logic */}
                    {item.moneyToCollect > 0 && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                Gestión de Cobro
                            </div>

                            <div className="flex items-center space-x-2 mb-3">
                                <input
                                    type="checkbox"
                                    id="confirmPayment"
                                    checked={confirmPayment}
                                    onChange={(e) => setConfirmPayment(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <Label htmlFor="confirmPayment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                                    Recibí el dinero del cliente
                                </Label>
                            </div>

                            {confirmPayment && (
                                <div className="space-y-1 animate-in zoom-in-95 duration-200">
                                    <Label className="text-xs text-slate-500">Monto Recibido</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            value={amountCollected}
                                            onChange={(e) => setAmountCollected(e.target.value)}
                                            className="pl-8 bg-white border-slate-200 text-slate-900"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        Se actualizará el saldo de la factura automáticamente.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
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
