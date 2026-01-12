"use client";
/* eslint-disable */

import { useState, useMemo } from "react";
import { ArrowLeft, Edit, Package, DollarSign, TrendingUp, Activity, Save, X, Image as ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import DeleteProductButton from "@/components/DeleteProductButton";
import { updateProduct } from "@/app/inventory/actions";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PricingIntelligence from "@/components/inventory/PricingIntelligence";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { useRouter } from "next/navigation";

interface ProductDetailViewProps {
    product: any;
    stockCount: number;
}

// Utility for formatting currency
const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$ 0";
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

export function ProductDetailView({ product, stockCount }: ProductDetailViewProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: product.name,
        basePrice: Number(product.basePrice),
        imageUrl: product.imageUrl || "",
        category: product.category,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProduct(product.id, formData);
            setIsEditing(false);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Analytics State
    const [timeFilter, setTimeFilter] = useState("ALL");

    // Memoized Calculations for Chart
    const chartData = useMemo(() => {
        const now = new Date();
        const filteredInstances = product.instances.filter((instance: any) => {
            const date = new Date(instance.updatedAt);
            if (timeFilter === "ALL") return true;
            if (timeFilter === "YEAR") return date.getFullYear() === now.getFullYear();
            if (timeFilter === "MONTH") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            if (timeFilter === "WEEK") {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return date >= oneWeekAgo;
            }
            return true;
        });

        // Group by Date for Chart
        const grouped = filteredInstances.reduce((acc: any, instance: any) => {
            const dateStr = new Date(instance.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            if (!acc[dateStr]) {
                acc[dateStr] = { date: dateStr, entradas: 0, salidas: 0 };
            }

            if (instance.saleId || instance.status === "SOLD") {
                acc[dateStr].salidas += 1;
            } else {
                acc[dateStr].entradas += 1;
            }
            return acc;
        }, {});

        return Object.values(grouped);
    }, [product.instances, timeFilter]);

    // Average Cost Calculation
    const averageCost = useMemo(() => {
        const instancesWithCost = product.instances.filter((i: any) => i.cost);
        if (instancesWithCost.length === 0) return null; // Return null if no cost records
        const totalCost = instancesWithCost.reduce((acc: number, curr: any) => acc + Number(curr.cost), 0);
        return totalCost / instancesWithCost.length;
    }, [product.instances]);

    // Calculate Margin
    const margin = averageCost ? ((formData.basePrice - averageCost) / formData.basePrice) * 100 : 0;


    return (
        <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-500 pb-20">

            <StockAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                productId={product.id}
                productName={product.name}
                currentStock={stockCount}
                averageCost={averageCost}
            />

            {/* 1. HUD SUPERIOR (Grid 2/3 + 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left: Image & Specs (2/3) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-6 items-start">
                    {/* Image Container */}
                    <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 relative group rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                        {(isEditing ? formData.imageUrl : product.imageUrl) ? (
                            <img
                                src={isEditing ? formData.imageUrl : product.imageUrl}
                                alt="Product Preview"
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('bg-slate-100');
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
                                <ImageIcon className="w-8 h-8" />
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Sin Imagen</span>
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute inset-x-1 bottom-1">
                                <input
                                    className="w-full text-[9px] bg-white/95 backdrop-blur border border-slate-200 rounded p-1 shadow-sm outline-none"
                                    placeholder="URL..."
                                    value={formData.imageUrl}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Specs & Titles */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px] uppercase px-2 py-0.5", stockCount > 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200")}>
                                {stockCount > 0 ? `${stockCount} En Stock` : "Agotado"}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 px-2 rounded-md">
                                {product.category}
                            </span>
                        </div>

                        {isEditing ? (
                            <textarea
                                className="text-2xl font-black text-slate-900 uppercase tracking-tight w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows={2}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            />
                        ) : (
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                {product.name}
                            </h1>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SKU: <span className="text-slate-900 font-bold">{product.sku}</span></span>
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">UPC: <span className="text-slate-900 font-bold">{product.upc}</span></span>
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Marca: <span className="text-slate-900 font-bold">{product.brand}</span></span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions (1/3) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Acciones Rápidas</h3>
                        <div className="flex gap-2 flex-wrap">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs uppercase flex items-center justify-center gap-2">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                    <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-white shadow-md font-bold text-xs uppercase flex items-center justify-center gap-2">
                                        <Save className="w-4 h-4" /> Guardar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="flex-1 py-2 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-sm">
                                        <Edit className="w-4 h-4" /> Editar
                                    </button>
                                    <button onClick={() => setIsAdjustmentModalOpen(true)} className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-sm">
                                        <Activity className="w-4 h-4" /> Ajustar Stock
                                    </button>
                                    <button
                                        onClick={() => window.history.length > 1 ? router.back() : router.push("/inventory")}
                                        className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    {/* Delete Zone */}
                    {!isEditing && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <DeleteProductButton productId={product.id} productName={product.name} />
                        </div>
                    )}
                </div>
            </div>

            {/* 2. TARJETAS FINANCIERAS (Horizontal Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cost Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Costo Promedio
                    </span>
                    {averageCost ? (
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                            {formatPrice(averageCost)}
                        </span>
                    ) : (
                        <span className="text-sm font-bold text-slate-400 italic">Sin registros de compra</span>
                    )}
                </div>

                {/* Price Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full -mr-4 -mt-4"></div>
                    <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1 flex items-center gap-1 relative z-10">
                        <DollarSign className="w-3 h-3" /> Precio Venta
                    </span>
                    {isEditing ? (
                        <input
                            type="number"
                            className="text-2xl font-black text-slate-900 bg-slate-50 border-b-2 border-blue-500 rounded-none w-full outline-none p-1"
                            value={formData.basePrice}
                            onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                        />
                    ) : (
                        <span className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
                            {formatPrice(formData.basePrice)}
                        </span>
                    )}
                </div>

                {/* Margin Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Margen Estimado
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-2xl font-black tracking-tight", margin > 30 ? "text-emerald-600" : margin > 15 ? "text-yellow-600" : "text-red-600")}>
                            {averageCost ? `${margin.toFixed(1)}%` : "-"}
                        </span>
                        {averageCost && (
                            <span className="text-[10px] font-bold text-slate-400 border border-slate-100 px-1 rounded">
                                {formatPrice(formData.basePrice - averageCost)} /u
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. CHART SECTION */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" /> Movimientos
                    </h3>
                    <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        {["ALL", "WEEK", "MONTH", "YEAR"].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={cn(
                                    "text-[9px] px-2 py-1 rounded font-bold transition-all uppercase",
                                    timeFilter === filter ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {filter === "ALL" ? "Total" : filter === "WEEK" ? "Sem" : filter === "MONTH" ? "Mes" : "Año"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                itemStyle={{ fontWeight: 600 }}
                            />
                            <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                            <Area type="monotone" dataKey="salidas" name="Salidas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSalidas)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. SECCIÓN DE INTELIGENCIA Y TÉCNICA (Bottom Wide) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product/Pricing Intelligence */}
                <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Smart Pricing & Insights</h3>
                    <PricingIntelligence productId={product.id} />
                </div>

                {/* Technical Details */}
                <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Ficha Técnica</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 text-xs">
                            <span className="text-slate-500">Descripción:</span>
                            <span className="font-bold text-slate-800 text-right">{product.description || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-2 text-xs">
                            <span className="text-slate-500">Categoría:</span>
                            <span className="font-bold text-slate-800 text-right">{product.category}</span>
                        </div>
                        <div className="grid grid-cols-2 text-xs">
                            <span className="text-slate-500">Fecha Creación:</span>
                            <span className="font-bold text-slate-800 text-right">{new Date(product.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-2 text-xs">
                            <span className="text-slate-500">Última Actualización:</span>
                            <span className="font-bold text-slate-800 text-right">{new Date(product.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-2 text-xs font-mono bg-white p-2 rounded border border-slate-100 mt-2">
                            <span className="text-slate-400">ID Interno:</span>
                            <span className="text-slate-600 text-right text-[10px] break-all">{product.id}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. HISTORY TABLE (Collapsed/Clean) */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historial de Unidades</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">ID / Serial</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Entidad / Autor</th>
                                <th className="px-4 py-3">Motivo / Notas</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {product.instances?.map((instance: any) => (
                                <tr key={instance.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-600">
                                        {instance.serialNumber ? (
                                            <span className="font-bold text-slate-800">{instance.serialNumber}</span>
                                        ) : (
                                            <span className="text-slate-400 italic">No Serial</span>
                                        )}
                                        <div className="text-[9px] text-slate-300">{instance.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none font-bold",
                                            instance.saleId || instance.status === "SOLD" ? "bg-red-50 text-red-600" :
                                                instance.adjustment && instance.adjustment.quantity < 0 ? "bg-orange-50 text-orange-600" :
                                                    instance.adjustment && instance.adjustment.quantity > 0 ? "bg-emerald-50 text-emerald-600" :
                                                        "bg-emerald-50 text-emerald-600"
                                        )}>
                                            {instance.saleId || instance.status === "SOLD" ? "Venta" :
                                                instance.adjustment ? (instance.adjustment.quantity > 0 ? "Ajuste (+)" : "Ajuste (-)") :
                                                    "Entrada"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {new Date(instance.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">
                                        {instance.purchase ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <Package className="w-3 h-3 text-slate-400" />
                                                    <span>{instance.purchase.supplier?.name || "Proveedor General"}</span>
                                                </div>
                                            </div>
                                        ) : instance.sale ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3 text-emerald-400" />
                                                    <span>{instance.sale.customer?.name || "Cliente Final"}</span>
                                                </div>
                                            </div>
                                        ) : instance.adjustment ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-orange-600">
                                                    <Activity className="w-3 h-3" />
                                                    <span>{instance.adjustment.category || "Ajuste Manual"}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 pl-4">
                                                    Por: {instance.adjustment.user?.name || "Admin"}
                                                </span>
                                            </div>
                                        ) : "Carga Inicial"}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={instance.adjustment?.reason}>
                                        {instance.adjustment?.reason || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                                        {formatPrice(instance.cost !== null ? Number(instance.cost) : 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
