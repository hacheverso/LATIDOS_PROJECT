"use strict";
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adjustStock } from "@/app/inventory/actions";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    currentStock: number;
    averageCost: number | null;
    defaultPrice?: number;
}

const ADJUSTMENT_CATEGORIES = [
    { value: "Corrección de Inventario", label: "Corrección de Inventario" },
    { value: "Daño de Fábrica", label: "Daño de Fábrica" },
    { value: "Pérdida/Robo", label: "Pérdida / Robo" },
    { value: "Uso Interno", label: "Uso Interno" },
    { value: "Devolución Cliente", label: "Devolución Cliente" },
    { value: "Otras Entradas", label: "Otras Entradas" },
];

export function StockAdjustmentModal({ isOpen, onClose, productId, productName, currentStock, averageCost, defaultPrice }: StockAdjustmentModalProps) {
    const [quantity, setQuantity] = useState<number>(0);
    const [category, setCategory] = useState(ADJUSTMENT_CATEGORIES[0].value);
    const [reason, setReason] = useState("");
    const [unitCost, setUnitCost] = useState<string>(
        averageCost ? Math.round(averageCost).toString() :
            (defaultPrice && defaultPrice > 0 ? defaultPrice.toString() : "0")
    );

    const [isLoading, setIsLoading] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Dynamic Stock Calculation
    const newStock = currentStock + quantity;
    const isNegativeStock = newStock < 0;

    // Reset unit cost to average when opening or when average changes
    useEffect(() => {
        if (isOpen) {
            if (averageCost) {
                setUnitCost(Math.round(averageCost).toString());
            } else if (defaultPrice && defaultPrice > 0) {
                setUnitCost(defaultPrice.toString());
            }
        }
    }, [isOpen, averageCost, defaultPrice]);

    const handlePreSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");

        if (isNegativeStock) {
            setError("Error: El stock resultante no puede ser negativo.");
            return;
        }
        if (quantity === 0) {
            setError("La cantidad no puede ser 0");
            return;
        }
        if (quantity > 0 && Number(unitCost) <= 0) {
            setError("El costo unitario no puede ser $0 para entradas de inventario.");
            return;
        }
        if (!reason.trim()) {
            setError("Debe indicar el motivo");
            return;
        }

        // Open PIN Modal for Signature
        setShowPinModal(true);
    };

    const handlePinSuccess = async (operator: { id: string, name: string }, pin: string) => {
        setShowPinModal(false);
        setIsLoading(true);

        try {
            await adjustStock(
                productId,
                quantity,
                reason,
                category,
                pin, // Pass PIN for backend verification/attribution
                quantity > 0 ? Number(unitCost) : undefined
            );

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setQuantity(0);
                setReason("");
                // setAdminPin(""); // Not needed anymore
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Error al realizar el ajuste");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px] bg-white border-slate-200 text-slate-900 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-black text-slate-900 flex items-center gap-2">
                            Ajuste Manual
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium">{productName}</p>
                    </DialogHeader>

                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-emerald-600 animate-in fade-in zoom-in">
                            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border-4 border-emerald-100 shadow-inner">
                                <span className="text-4xl">✓</span>
                            </div>
                            <p className="font-black text-lg">Ajuste Firmado</p>
                            <p className="text-xs text-slate-400 mt-1">Registrado en auditoría</p>
                        </div>
                    ) : (
                        <form onSubmit={handlePreSubmit} className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-wide">Stock Actual:</span>
                                <span className="text-slate-900 font-black text-lg">{currentStock}</span>
                            </div>

                            {/* Quantity Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Cantidad (+/-)</label>
                                {/* Custom Controls Container */}
                                <div className="relative group">
                                    {/* Left Badge */}
                                    {quantity !== 0 && (
                                        <div className={`absolute top-1/2 -translate-y-1/2 left-4 font-bold text-[10px] uppercase px-2 py-1 rounded-full tracking-wider shadow-sm z-10 
                                                ${quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {quantity > 0 ? 'Entrada' : 'Salida'}
                                        </div>
                                    )}

                                    {/* Input */}
                                    <input
                                        type="number"
                                        required
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className={`w-full text-center text-5xl font-black p-6 rounded-2xl outline-none transition-all shadow-sm border-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                                ${quantity > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 focus:border-emerald-500' :
                                                quantity < 0 ? 'bg-red-50 text-red-600 border-red-200 focus:border-red-500' : 'bg-white text-slate-300 border-slate-200 focus:border-slate-400'}`}
                                        placeholder="0"
                                    />

                                    {/* Right Controls (Arrows) */}
                                    <div className="absolute right-2 top-2 bottom-2 flex flex-col gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => q + 1)}
                                            className="flex-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors flex items-center justify-center active:bg-slate-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => q - 1)}
                                            className="flex-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center active:bg-slate-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Stock Preview */}
                                <div className="flex items-center justify-center gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
                                    <span className="text-xs uppercase font-bold text-slate-400">Nuevo Stock:</span>
                                    <span className={`text-xl font-black transition-colors ${newStock > 0 ? "text-slate-900" :
                                        newStock === 0 ? "text-orange-500" : "text-red-500"
                                        }`}>
                                        {newStock}
                                    </span>
                                </div>
                            </div>

                            {/* Cost Input (Only for Additions) */}
                            {quantity > 0 && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Costo Unitario (COP)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={unitCost}
                                            onChange={(e) => setUnitCost(e.target.value)}
                                            className="w-full text-right text-lg font-bold p-2 pl-8 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right mt-1">
                                        Promedio Actual: <span className="font-bold text-slate-600">${averageCost ? Math.round(averageCost).toLocaleString() : "0"}</span>
                                    </p>
                                </div>
                            )}

                            {/* Reason & Category */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Categoría</label>
                                    <div className="relative">
                                        <select
                                            className="w-full text-xs p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-bold appearance-none focus:border-slate-300 outline-none transition-all cursor-pointer hover:bg-slate-100"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            {ADJUSTMENT_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Justificación *</label>
                                    <textarea
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full text-sm p-3 rounded-xl border-2 border-slate-100 bg-white text-slate-900 h-20 resize-none outline-none focus:border-slate-300 focus:ring-0 font-medium placeholder:text-slate-300 transition-all"
                                        placeholder="Describa la razón del ajuste..."
                                    />
                                </div>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 bg-transparent hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || quantity === 0 || isNegativeStock}
                                    className="flex-[2] py-4 bg-slate-900 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 hover:shadow-xl hover:shadow-slate-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <ShieldCheck className="w-4 h-4 text-slate-400" /> Confirmar Ajuste
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <PinSignatureModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSuccess}
                actionName={`Ajuste de Stock (${productName})`}
            />
        </>
    );
}
