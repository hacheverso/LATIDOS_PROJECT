import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, AlertTriangle } from "lucide-react";
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
    hasZeroCostItems?: boolean;
}

export default function VerificationModal({
    isOpen,
    onClose,
    onConfirm,
    totalUnits,
    totalCostUSD,
    totalCostCOP,
    totalLastCost = 0,
    currency,
    hasZeroCostItems = false
}: VerificationModalProps) {
    // Logic: Compare Total Current vs Total Last
    const diff = totalCostCOP - totalLastCost;
    // Only color if totalLastCost > 0 (meaning we have history)
    const hasHistory = totalLastCost > 0;
    const isCheaper = hasHistory && diff < 0;
    const isMoreExpensive = hasHistory && diff > 0;

    const copColorClass = !hasHistory 
        ? "text-slate-600 dark:text-slate-300" 
        : (isCheaper ? "text-emerald-600 dark:text-emerald-400" : (isMoreExpensive ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"));
    
    const copBgClass = !hasHistory 
        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold" 
        : (isCheaper ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold" : (isMoreExpensive ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card text-primary border-border p-0 overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-border bg-slate-50/50 dark:bg-white/5">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                            <Layers className="w-5 h-5 text-transfer" />
                            Verificación de Borrador
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5 bg-card">
                    <div className="flex justify-between items-center p-4 bg-slate-100/80 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:shadow-md">
                        <span className="text-secondary font-bold uppercase text-xs tracking-wider">Total Items</span>
                        <span className="text-2xl font-black text-primary">{totalUnits}</span>
                    </div>

                    <div className="flex flex-col gap-3 p-5 bg-slate-100/80 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:shadow-md">
                        <span className="text-secondary font-bold uppercase text-xs tracking-wider">Costo Total Estimado</span>

                        <div className="flex flex-col gap-2">
                            {/* Primary Display based on Currency Mode */}
                            {currency === "USD" ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-black tracking-tight text-primary">
                                            $ {totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md text-[11px] bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest shadow-sm">
                                            USD
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                                        <span className={cn("text-xl font-bold transition-colors", copColorClass)}>
                                            ≈ $ {totalCostCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider", copBgClass)}>
                                            COP
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-3xl font-black tracking-tight transition-colors", copColorClass)}>
                                        $ {totalCostCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                    <span className={cn("px-2.5 py-1 rounded-md text-[11px] uppercase tracking-widest shadow-sm", copBgClass)}>
                                        COP
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {hasZeroCostItems && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/30 rounded-xl flex items-start gap-3 shadow-sm">
                            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <div className="text-left text-sm text-orange-800 dark:text-orange-200">
                                <p className="font-bold text-orange-700 dark:text-orange-400 uppercase text-xs mb-1">Items con costo cero</p>
                                Hay productos con costo $0 en esta recepción. Podrás editar y corregir estos costos más adelante antes de la confirmación final.
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-secondary text-center px-2 font-medium">
                        ¿Estás seguro de proceder con el guardado? Esta acción guardará el borrador para su revisión y confirmación posterior.
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-border flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <DialogFooter className="w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-full sm:w-auto text-secondary hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={onConfirm}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all"
                        >
                            Proceder con el guardado
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
