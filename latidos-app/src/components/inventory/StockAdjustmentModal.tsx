"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adjustStock } from "@/app/inventory/actions";
import { Loader2, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    currentStock: number;
    averageCost: number | null;
}

const ADJUSTMENT_CATEGORIES = [
    { value: "Corrección de Inventario", label: "Corrección de Inventario" },
    { value: "Daño de Fábrica", label: "Daño de Fábrica" },
    { value: "Pérdida/Robo", label: "Pérdida / Robo" },
    { value: "Uso Interno", label: "Uso Interno" },
    { value: "Devolución Cliente", label: "Devolución Cliente" },
    { value: "Otras Entradas", label: "Otras Entradas" },
];

export function StockAdjustmentModal({ isOpen, onClose, productId, productName, currentStock, averageCost }: StockAdjustmentModalProps) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    const [quantity, setQuantity] = useState<number>(0);
    const [category, setCategory] = useState(ADJUSTMENT_CATEGORIES[0].value);
    const [reason, setReason] = useState("");
    const [adminPin, setAdminPin] = useState("");
    const [unitCost, setUnitCost] = useState<string>(averageCost ? Math.round(averageCost).toString() : "0");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Dynamic Stock Calculation
    const newStock = currentStock + quantity;
    const isNegativeStock = newStock < 0;

    // Reset unit cost to average when opening or when average changes
    useEffect(() => {
        if (isOpen && averageCost) {
            setUnitCost(Math.round(averageCost).toString());
        }
    }, [isOpen, averageCost]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");

        if (isNegativeStock) {
            setError("Error: El stock resultante no puede ser negativo.");
            return;
        }

        setIsLoading(true);

        try {
            if (quantity === 0) throw new Error("La cantidad no puede ser 0");

            await adjustStock(
                productId,
                quantity,
                reason,
                category,
                !isAdmin ? adminPin : undefined,
                quantity > 0 ? Number(unitCost) : undefined
            );

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setQuantity(0);
                setReason("");
                setAdminPin("");
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Error al realizar el ajuste");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] border-slate-700 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-wider font-bold text-slate-100">Ajuste Manual de Stock</DialogTitle>
                    <p className="text-xs text-slate-400">{productName}</p>
                </DialogHeader>

                {success ? (
                    <div className="py-8 flex flex-col items-center justify-center text-emerald-500 animate-in fade-in zoom-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-950/50 flex items-center justify-center mb-2 border border-emerald-900">
                            <span className="text-2xl">✓</span>
                        </div>
                        <p className="font-bold">Ajuste realizado correctamente</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Summary Card */}
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between text-xs shadow-sm">
                            <span className="text-slate-400 font-bold uppercase">Stock Actual:</span>
                            <span className="text-white font-black text-sm">{currentStock} Unidades</span>
                        </div>

                        {/* Quantity Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cantidad (Positivo: Agregar, Negativo: Quitar)</label>
                            <input
                                type="number"
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className={`w-full text-center text-5xl font-black p-4 rounded-lg outline-none transition-all shadow-inner
                                    ${quantity > 0 ? 'bg-white text-emerald-600 border-4 border-emerald-500' :
                                        quantity < 0 ? 'bg-white text-red-600 border-4 border-red-500' : 'bg-white text-slate-900 border-4 border-slate-200'}`}
                                placeholder="0"
                            />

                            {/* Dynamic Stock Preview */}
                            <div className="flex items-center justify-center gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
                                <span className="text-xs uppercase font-bold text-slate-400">El stock quedará en:</span>
                                <span className={`text-lg font-black transition-colors ${newStock > 0 ? "text-emerald-500" :
                                    newStock === 0 ? "text-orange-500" : "text-red-500"
                                    }`}>
                                    {newStock} Unidades
                                </span>
                            </div>

                            {quantity < 0 && (
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide text-center bg-red-950/30 py-1 rounded">
                                    Se descontarán {Math.abs(quantity)} unidades (FIFO)
                                </p>
                            )}
                        </div>

                        {/* Cost Input (Only for Additions) */}
                        {quantity > 0 && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Costo Unitario de Entrada (COP)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={unitCost}
                                        onChange={(e) => setUnitCost(e.target.value)}
                                        className="w-full text-right text-lg font-bold p-3 pl-8 rounded-lg border-2 border-slate-700 bg-slate-800 text-white outline-none focus:border-emerald-500 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-500 text-right">
                                    {averageCost ? `Costo Promedio Actual: $${Math.round(averageCost).toLocaleString()}` : "No hay costo promedio registrado"}
                                </p>
                            </div>
                        )}

                        {/* Category Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Categoría</label>
                            <div className="relative">
                                <select
                                    className="w-full text-sm p-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 font-bold appearance-none"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    {ADJUSTMENT_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Reason Textarea */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivo / Justificación *</label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full text-sm p-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 h-24 resize-none outline-none focus:border-blue-500 font-medium"
                                placeholder="Describa la razón del ajuste..."
                            />
                        </div>

                        {/* Security PIN (Conditional) */}
                        {!isAdmin && (
                            <div className="bg-[#4A1E1E] p-4 rounded-xl border border-red-900/50 space-y-4 shadow-lg relative overflow-hidden group">
                                {/* Decorator */}
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all"></div>

                                <div className="flex items-center gap-3 text-white relative z-10">
                                    <div className="bg-red-500/20 p-1.5 rounded-full">
                                        <AlertCircle className="w-5 h-5 text-red-100" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-wider text-red-50">Autorización Requerida</span>
                                </div>

                                <p className="text-[11px] text-red-200/90 leading-relaxed relative z-10 px-1">
                                    Su usuario no est&aacute; autorizado para realizar ajustes manuales. <br />
                                    <span className="font-bold text-white">Ingrese un PIN de Administrador para continuar.</span>
                                </p>

                                <input
                                    type="password"
                                    required
                                    value={adminPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setAdminPin(val);
                                        if (val.length === 4) {
                                            handleSubmit();
                                        }
                                    }}
                                    className="w-full text-center tracking-[1em] font-mono p-3 border-none rounded-lg bg-white text-slate-900 text-lg font-bold placeholder:text-slate-300 shadow-lg ring-4 ring-transparent focus:ring-red-500/30 outline-none transition-all relative z-10"
                                    placeholder="PIN"
                                    maxLength={4}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-200 text-xs font-bold rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 text-xs font-bold uppercase text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || quantity === 0 || isNegativeStock}
                                className="flex-1 py-3 bg-[#0056b3] text-white text-xs font-black uppercase rounded-xl hover:bg-[#004494] hover:shadow-lg hover:shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Ajuste"}
                            </button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
