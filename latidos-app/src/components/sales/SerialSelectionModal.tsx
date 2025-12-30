/* eslint-disable */
import { useState, useEffect } from "react";
import { X, Check, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvailableInstances, checkSerialOwnership } from "@/app/sales/actions";

interface SerialSelectionModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (instance: any) => void;
}

export function SerialSelectionModal({ product, isOpen, onClose, onSelect }: SerialSelectionModalProps) {
    const [instances, setInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
    const [manualInput, setManualInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && product) {
            setLoading(true);
            setSelectedSerials([]);
            setManualInput("");
            try {
                getAvailableInstances(product.id).then(data => {
                    // Filter out N/A or null serials
                    const specific = data.filter(i => i.serialNumber && i.serialNumber !== "N/A");
                    setInstances(specific);
                });
            } catch (e) {
                console.error("Error fetching instances", e);
            } finally {
                setLoading(false);
            }
        }
    }, [isOpen, product]);

    const toggleSerial = (serial: string) => {
        setSelectedSerials(prev =>
            prev.includes(serial)
                ? prev.filter(s => s !== serial)
                : [...prev, serial]
        );
    };

    const addManualSerial = async () => {
        if (!manualInput.trim()) return;
        setError("");
        const serial = manualInput.trim().toUpperCase();

        // Prevent duplicates in selection
        if (selectedSerials.includes(serial)) {
            setManualInput("");
            return;
        }

        const existing = instances.find(i => i.serialNumber === serial);
        if (existing) {
            toggleSerial(serial);
            setManualInput("");
            return;
        }

        // Cross-Check Validation
        try {
            const check = await checkSerialOwnership(serial);
            if (check && check.productId !== product.id) {
                setError(`⚠️ Error: El serial ${serial} pertenece a ${check.productName} y no puede asignarse a este ítem`);
                return;
            }
        } catch (e) {
            console.error("Validation error", e);
        }

        setSelectedSerials(prev => [...prev, serial]);
        setManualInput("");
    };

    const handleConfirm = () => {
        // Return array of simple objects or just strings?
        // Parent expects instances. For manual ones, we mock an instance structure.
        const result = selectedSerials.map(s => {
            const existing = instances.find(i => i.serialNumber === s);
            return existing ? { ...existing, product } : { serialNumber: s, isManual: true, product };
        });
        onSelect(result);
        onClose();
    };

    if (!isOpen) return null;

    // Combine visual list: Database Instances + Manual Entries (that aren't in DB items)
    // Actually, manual entries purely existing in 'selectedSerials' but not in 'instances' need to be shown too?
    // Let's verify: The User wants to be able to scan/input manually if NO serials exist.
    // "Si no hay seriales... habilita un campo".
    // "Permite que el usuario ingrese varios seriales".

    // We will show the list of Available DB instances.
    // We will ALSO show a list of "Selected Manually" that are not in DB?
    // Simpler: Just rely on checked state.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center flex-none">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase">Seleccionar Seriales</h3>
                        <p className="text-sm text-slate-500">{product?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Manual Input Bar */}
                <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-2 flex-none">
                    <div className="flex gap-2">
                        <input
                            className={cn(
                                "flex-1 bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:ring-2",
                                error ? "border-red-500 focus:ring-red-500 text-red-600" : "border-slate-200 focus:ring-blue-500"
                            )}
                            placeholder="Escanear o Escribir Serial..."
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addManualSerial();
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={addManualSerial}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                    {error && (
                        <div className="text-xs font-bold text-red-500 animate-pulse bg-red-50 p-2 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* 1. Database Instances */}
                            {instances.map((inst) => {
                                const isSelected = selectedSerials.includes(inst.serialNumber);
                                return (
                                    <button
                                        key={inst.id}
                                        onClick={() => toggleSerial(inst.serialNumber)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center group",
                                            isSelected
                                                ? "border-blue-600 bg-blue-50/50"
                                                : "border-slate-100 hover:border-blue-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div>
                                            <p className={cn(
                                                "font-mono font-bold text-sm uppercase transition-colors",
                                                isSelected ? "text-blue-700" : "text-slate-700"
                                            )}>
                                                {inst.serialNumber}
                                            </p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                                    {inst.condition}
                                                </span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}

                            {/* 2. Manual Entries (Show explicitly if they are not in DB list) */}
                            {selectedSerials
                                .filter(s => !instances.some(i => i.serialNumber === s))
                                .map((s, idx) => (
                                    <div key={`manual-${idx}`} className="w-full text-left p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50 flex justify-between items-center animate-in slide-in-from-top-1">
                                        <div>
                                            <p className="font-mono font-bold text-sm uppercase text-blue-700">
                                                {s}
                                            </p>
                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                                                MANUAL
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => toggleSerial(s)}
                                            className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            }

                            {instances.length === 0 && selectedSerials.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No hay seriales en stock.</p>
                                    <p className="text-xs mt-1">Ingresa uno manualmente arriba.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex-none">
                    <div className="flex justify-between items-center mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>Ingresados: {selectedSerials.length}</span>
                        {/* Example target placeholder if we had one */}
                        {/* <span>Requeridos: -</span> */}
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedSerials.length === 0}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Selección ({selectedSerials.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
