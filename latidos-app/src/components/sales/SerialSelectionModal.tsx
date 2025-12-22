/* eslint-disable */
import { useState, useEffect } from "react";
import { X, Check, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvailableInstances } from "@/app/sales/actions";

interface SerialSelectionModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (instance: any) => void;
}

export function SerialSelectionModal({ product, isOpen, onClose, onSelect }: SerialSelectionModalProps) {
    const [instances, setInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSerial, setSelectedSerial] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && product) {
            setLoading(true);
            try {
                getAvailableInstances(product.id).then(data => {
                    setInstances(data);
                });
            } catch (e) {
                console.error("Error fetching instances", e);
            } finally {
                setLoading(false);
            }
        }
    }, [isOpen, product]);

    const handleConfirm = () => {
        if (!selectedSerial) return;
        const instance = instances.find(i => i.serialNumber === selectedSerial);
        if (instance) {
            const fullInstance = {
                ...instance,
                product: product // Re-attach product info for the Cart
            };
            onSelect(fullInstance);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase">Seleccionar Serial</h3>
                        <p className="text-sm text-slate-500">{product.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* List */}
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : instances.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay seriales disponibles.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {instances.map((inst) => (
                                <button
                                    key={inst.id}
                                    onClick={() => setSelectedSerial(inst.serialNumber)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center group",
                                        selectedSerial === inst.serialNumber
                                            ? "border-blue-600 bg-blue-50/50"
                                            : "border-slate-100 hover:border-blue-300 hover:bg-slate-50"
                                    )}
                                >
                                    <div>
                                        <p className={cn(
                                            "font-mono font-bold text-lg uppercase group-hover:text-blue-700 transition-colors",
                                            selectedSerial === inst.serialNumber ? "text-blue-700" : "text-slate-700"
                                        )}>
                                            {inst.serialNumber || "N/A"}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                                {inst.condition}
                                            </span>
                                            {inst.location && (
                                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                                                    {inst.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedSerial === inst.serialNumber && (
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedSerial}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Selección
                    </button>
                </div>
            </div>
        </div>
    );
}
