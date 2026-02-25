"use client";

import { useState, useMemo, Fragment } from "react";
import Image from "next/image";
import { Search, Save, RotateCcw, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveAudit } from "../actions"; // We will create this
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    sku: string;
    upc: string;
    imageUrl: string | null;
    systemStock: number;
    category: string;
}

interface AuditTableProps {
    initialProducts: Product[];
}

interface AuditRow {
    productId: string;
    physicalCount: number | "";
    observations: string;
    verified: boolean;
}

export default function AuditTable({ initialProducts }: AuditTableProps) {
    const [search, setSearch] = useState("");
    const [auditData, setAuditData] = useState<Record<string, AuditRow>>({});
    const [loading, setLoading] = useState(false);

    // Initial State or Reset
    const getRowState = (productId: string) => {
        return auditData[productId] || {
            productId,
            physicalCount: "", // Empty by default to force user input? Or 0? Empty is better to distinguish "not counted" vs "0 found".
            observations: "",
            verified: false
        };
    };

    const handleCountChange = (productId: string, val: string) => {
        const num = val === "" ? "" : parseInt(val);
        if (num !== "" && isNaN(num)) return;

        setAuditData(prev => ({
            ...prev,
            [productId]: {
                ...getRowState(productId),
                physicalCount: num,
                verified: true // Auto-verify on input? Or manual check? Let's auto-verify that we touched it.
            }
        }));
    };

    const handleObservationChange = (productId: string, val: string) => {
        setAuditData(prev => ({
            ...prev,
            [productId]: {
                ...getRowState(productId),
                observations: val
            }
        }));
    };

    const handleReset = () => {
        if (confirm("¿Estás seguro de reiniciar la auditoría? Se perderán todos los datos no guardados.")) {
            setAuditData({});
            toast.info("Auditoría reiniciada.");
        }
    };

    const handleFinish = async () => {
        // Filter only modified rows? Or send all?
        // User wants to "Finalize". Usually this means submitting what we found.
        // If phyiscalCount is empty -> we assume we didn't count it (ignore? or assume 0? Dangerous to assume 0).
        // Let's warn if there are uncounted items, or just submit the counted ones.

        const countedItems = Object.values(auditData).filter(row => row.physicalCount !== "");

        if (countedItems.length === 0) {
            toast.error("No has contado ningún producto.");
            return;
        }

        if (!confirm(`¿Confirmar auditoría con ${countedItems.length} productos contados?`)) return;

        setLoading(true);
        try {
            const result = await saveAudit(countedItems.map(item => ({
                productId: item.productId,
                physicalCount: Number(item.physicalCount),
                observations: item.observations
            })));

            if (result.success) {
                toast.success("Auditoría guardada exitosamente.");
                setAuditData({}); // Clear after save? Or keep feedback?
                // Probably redirect to report or show success modal.
            } else {
                toast.error(result.error || "Error al guardar auditoría");
            }
        } catch (e) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const groupedProducts = useMemo(() => {
        let products = initialProducts;

        // Filter Logic
        if (!search) {
            // Default: Hide 0 stock
            products = products.filter(p => p.systemStock > 0);
        } else {
            // Search: Show all matches (even 0 stock)
            const low = search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(low) ||
                p.sku.toLowerCase().includes(low) ||
                p.upc.toLowerCase().includes(low)
            );
        }

        // Group by Category
        const groups: Record<string, Product[]> = {};
        products.forEach(p => {
            const cat = p.category || "SIN CATEGORÍA";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });

        // Sort Categories Alphabetically
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [initialProducts, search]);

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar producto, SKU o escanear..."
                        className="pl-9 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleReset} className="flex-1 md:flex-none gap-2 text-slate-600 dark:text-slate-300 dark:border-white/20 dark:hover:bg-white/10">
                        <RotateCcw className="w-4 h-4" />
                        Reiniciar
                    </Button>
                    <Button onClick={handleFinish} disabled={loading} className="flex-1 md:flex-none gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                        <Save className="w-4 h-4" />
                        {loading ? "Guardando..." : "Finalizar Auditoría"}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-[#1A1C1E] border-b border-slate-100 dark:border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Producto</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-24">UPC</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-28">Sistema</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-32">Físico</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-28">Diferencia</th>
                                <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {groupedProducts.map(([category, products]) => (
                                <Fragment key={category}>
                                    {/* Category Header */}
                                    <tr className="bg-slate-100/80 dark:bg-white/5 border-y border-slate-200 dark:border-white/10">
                                        <td colSpan={6} className="px-4 py-2 font-black text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wider">
                                            {category} <span className="text-slate-400 font-normal">({products.length})</span>
                                        </td>
                                    </tr>

                                    {/* Products */}
                                    {products.map(product => {
                                        const rowState = getRowState(product.id);
                                        const count = rowState.physicalCount;
                                        const diff = count !== "" ? (count as number) - product.systemStock : 0;
                                        const isMatched = count !== "" && diff === 0;
                                        const isMismatch = count !== "" && diff !== 0;

                                        return (
                                            <tr
                                                key={product.id}
                                                className={cn(
                                                    "transition-colors",
                                                    isMatched ? "bg-green-50/50 dark:bg-green-500/10" : isMismatch ? "bg-red-50/50 dark:bg-red-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {product.imageUrl ? (
                                                                <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 max-w-[200px] md:max-w-xs xl:max-w-sm">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate" title={product.name}>{product.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {product.upc && (
                                                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                                                            {product.upc}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold font-mono">
                                                        {product.systemStock}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        className={cn(
                                                            "w-20 h-9 text-center font-bold font-mono mx-auto text-lg",
                                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                            isMatched ? "border-green-500 text-green-700 dark:text-green-400 ring-green-200 dark:ring-green-900 bg-white dark:bg-[#1A1C1E]" :
                                                                isMismatch ? "border-red-500 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-900 bg-white dark:bg-[#1A1C1E]" : "text-black dark:text-white border-slate-300 dark:border-white/20 bg-white dark:bg-[#1A1C1E]"
                                                        )}
                                                        value={count}
                                                        onChange={(e) => handleCountChange(product.id, e.target.value)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {count !== "" && (
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                                                            diff === 0 ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" :
                                                                diff > 0 ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                                                        )}>
                                                            {diff > 0 ? "+" : ""}{diff}
                                                            {diff === 0 && <CheckCircle2 className="w-3 h-3" />}
                                                            {diff !== 0 && <AlertCircle className="w-3 h-3" />}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input
                                                        placeholder="Nota opcional..."
                                                        className="h-9 text-xs font-semibold text-slate-900 dark:text-white border-transparent bg-transparent hover:bg-white dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-slate-300 dark:focus:border-white/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                        value={rowState.observations}
                                                        onChange={(e) => handleObservationChange(product.id, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ))}
                            {groupedProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                        No se encontraron productos
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
