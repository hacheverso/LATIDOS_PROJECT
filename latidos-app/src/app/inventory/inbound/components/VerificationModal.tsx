import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    totalUnits: number;
    totalCostUSD: number;
    totalCostCOP: number;
    totalLastCost?: number; // Optional reference
    currency: "USD" | "COP";
}

export default function VerificationModal({
    isOpen,
    onClose,
    onConfirm,
    totalUnits,
    totalCostUSD,
    totalCostCOP,
    totalLastCost = 0,
    currency
}: VerificationModalProps) {
    // Logic: Compare Total Current vs Total Last
    const diff = totalCostCOP - totalLastCost;
    // Only color if totalLastCost > 0 (meaning we have history)
    const hasHistory = totalLastCost > 0;
    const isCheaper = hasHistory && diff < 0;
    const isMoreExpensive = hasHistory && diff > 0;

    const copColorClass = !hasHistory ? "text-slate-200" : (isCheaper ? "text-emerald-400" : (isMoreExpensive ? "text-red-400" : "text-slate-200"));
    const copBgClass = !hasHistory ? "bg-slate-700 font-bold text-slate-300" : (isCheaper ? "bg-emerald-900/30 font-bold text-emerald-400" : (isMoreExpensive ? "bg-red-900/30 font-bold text-red-400" : "bg-slate-700 font-bold text-slate-300"));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-slate-900 text-white border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-500" />
                        Verificación de Recepción
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <span className="text-slate-400 font-bold uppercase text-xs">Total Items</span>
                        <span className="text-2xl font-black">{totalUnits}</span>
                    </div>

                    <div className="flex flex-col gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <span className="text-slate-400 font-bold uppercase text-xs mb-1">Costo Total Estimado</span>

                        <div className="flex flex-col gap-1">
                            {/* Primary Display based on Currency Mode */}
                            {currency === "USD" ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-white">$ {totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 font-bold text-slate-300">USD</span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-700/50">
                                        <span className={cn("text-xl font-bold transition-colors", copColorClass)}>≈ $ {totalCostCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span className={cn("px-2 py-0.5 rounded text-[10px]", copBgClass)}>COP</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-2xl font-black transition-colors", copColorClass)}>$ {totalCostCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    <span className={cn("px-2 py-0.5 rounded text-[10px]", copBgClass)}>COP</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 text-center px-4">
                        ¿Estás seguro de proceder con el guardado? Esta acción impactará el inventario inmediatamente.
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                        Proceder con el guardado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
