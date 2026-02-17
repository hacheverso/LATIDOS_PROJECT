import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Barcode, ScanBarcode, AlignLeft, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BulkSerialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (serials: string[]) => void;
    productName: string;
    quantity: number;
    onQuantityChange: (newQty: number) => void;
}

export default function BulkSerialModal({
    isOpen,
    onClose,
    onConfirm,
    productName,
    quantity,
    onQuantityChange
}: BulkSerialModalProps) {
    const [mode, setMode] = useState<"SELECT" | "MANUAL">("SELECT");
    const [rawSerials, setRawSerials] = useState("");
    const [error, setError] = useState("");
    const [validationState, setValidationState] = useState<{ valid: boolean; message: string; type: "success" | "error" | "warning" }>({ valid: false, message: "", type: "warning" });
    const [parsedSerialsDisplay, setParsedSerialsDisplay] = useState<{ text: string; status: "ok" | "duplicate" }[]>([]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setMode("SELECT");
            setRawSerials("");
            setError("");
            setValidationState({ valid: false, message: "", type: "warning" });
            setParsedSerialsDisplay([]);
        }
    }, [isOpen]);

    // Real-time validation
    useEffect(() => {
        // Parse serials
        const serials = rawSerials.split(/[\n, ]+/).map(s => s.trim()).filter(s => s.length > 0);
        const count = serials.length;

        // Find duplicates
        const counts: Record<string, number> = {};
        serials.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

        // Update Display
        const displayData = serials.map(s => ({
            text: s,
            status: counts[s] > 1 ? "duplicate" : "ok"
        })) as { text: string; status: "ok" | "duplicate" }[];

        setParsedSerialsDisplay(displayData);

        if (mode !== "MANUAL") return;

        // Validations
        const unique = new Set(serials);
        const hasDuplicates = unique.size !== count;

        if (count === 0) {
            setValidationState({ valid: false, message: "Esperando seriales...", type: "warning" });
        } else if (hasDuplicates) {
            setValidationState({ valid: false, message: `⚠️ Hay seriales duplicados (marcados en rojo).`, type: "error" });
        } else if (count < quantity) {
            setValidationState({ valid: false, message: `Faltan ${quantity - count} seriales.`, type: "warning" });
        } else if (count > quantity) {
            setValidationState({ valid: false, message: `Sobran ${count - quantity} seriales.`, type: "error" });
        } else {
            setValidationState({ valid: true, message: "Cantidad y seriales correctos.", type: "success" });
        }
    }, [rawSerials, quantity, mode]);

    const handleConfirmManual = () => {
        if (!validationState.valid) {
            setError(validationState.message);
            return;
        }
        const serials = rawSerials.split(/[\n, ]+/).map(s => s.trim()).filter(s => s.length > 0);
        onConfirm(serials);
    };

    const handleAuto = () => {
        // Return empty array to signal "Auto Generated" logic in parent
        onConfirm([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl bg-white text-slate-900 border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase flex items-center gap-2 text-slate-800">
                        <ScanBarcode className="w-6 h-6 text-blue-600" />
                        Ingreso Masivo
                    </DialogTitle>
                    <DialogDescription>
                        Producto: <span className="font-bold text-slate-700">{productName}</span>
                    </DialogDescription>

                    <div className="flex items-center gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Cantidad esperada:</span>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                    onQuantityChange(val);
                                }
                            }}
                            className="w-24 px-2 py-1 font-bold text-blue-600 text-lg bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </DialogHeader>

                <div className="py-2">
                    {mode === "SELECT" ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleAuto}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <Barcode className="w-8 h-8 text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-slate-700">Automático</div>
                                    <div className="text-xs text-slate-400 mt-1">Generar los <span className="font-bold">{quantity}</span> seriales</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode("MANUAL")}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <AlignLeft className="w-8 h-8 text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-slate-700">Manual</div>
                                    <div className="text-xs text-slate-400 mt-1">Pegar lista de <span className="font-bold">{quantity}</span> seriales</div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-500 uppercase">Seriales detectados</label>
                                <div className={cn(
                                    "text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all",
                                    validationState.type === "success" ? "bg-green-100 text-green-700" :
                                        validationState.type === "error" ? "bg-red-100 text-red-700" :
                                            "bg-orange-100 text-orange-700"
                                )}>
                                    <span>{parsedSerialsDisplay.length} / {quantity}</span>
                                    {validationState.type === "success" && <ScanBarcode className="w-3 h-3" />}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                                <textarea
                                    value={rawSerials}
                                    onChange={(e) => {
                                        setRawSerials(e.target.value);
                                        setError("");
                                    }}
                                    className={cn(
                                        "w-full h-full p-4 bg-slate-50 border-2 rounded-xl font-mono text-sm outline-none resize-none transition-all",
                                        validationState.type === "error" ? "border-red-300 focus:border-red-500 bg-red-50/10" :
                                            validationState.type === "success" ? "border-green-300 focus:border-green-500 bg-green-50/10" :
                                                "border-slate-200 focus:border-blue-500"
                                    )}
                                    placeholder={`Escanea o pega los ${quantity} seriales aquí...`}
                                    autoFocus
                                />

                                {/* Live Preview with Badges */}
                                <div className="h-full overflow-y-auto p-4 bg-slate-100/50 rounded-xl border border-slate-200 content-start">
                                    {parsedSerialsDisplay.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                                            <Barcode className="w-8 h-8 mb-2 opacity-50" />
                                            Vista previa de seriales
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {parsedSerialsDisplay.map((item, idx) => (
                                                <div
                                                    key={`${item.text}-${idx}`}
                                                    className={cn(
                                                        "text-xs px-2 py-1 rounded font-mono font-bold border transition-colors",
                                                        item.status === "duplicate"
                                                            ? "bg-red-500 text-white border-red-600 animate-pulse"
                                                            : "bg-white text-slate-600 border-slate-300"
                                                    )}
                                                >
                                                    {item.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Validation Message */}
                            <div className={cn(
                                "flex items-center gap-2 p-3 rounded-lg text-sm font-bold transition-all",
                                validationState.type === "success" ? "bg-green-50 text-green-700" :
                                    validationState.type === "error" ? "bg-red-50 text-red-600" :
                                        "bg-orange-50 text-orange-600"
                            )}>
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {validationState.message}
                            </div>

                            <div className="flex justify-between pt-2">
                                <Button variant="ghost" onClick={() => setMode("SELECT")}>
                                    Atrás
                                </Button>
                                <Button
                                    onClick={handleConfirmManual}
                                    disabled={!validationState.valid}
                                    className={cn(
                                        "font-bold transition-all",
                                        validationState.valid ? "bg-green-600 hover:bg-green-500 text-white" : "bg-slate-200 text-slate-400"
                                    )}
                                >
                                    Confirmar Seriales
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
