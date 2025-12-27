import Link from "next/link";
import { Plus, PackageCheck, AlertTriangle, TrendingUp, AlertOctagon, DollarSign, Package, Anchor } from "lucide-react";
import InventoryHeaderActions from "./InventoryHeaderActions";
import { DashboardCharts } from "./components/DashboardCharts";
import { getDashboardMetrics } from "./actions";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    const metrics = await getDashboardMetrics();

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 font-medium">Inteligencia de Negocio y Estrategia</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/inventory/new"
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo
                    </Link>
                    <Link
                        href="/inventory/inbound"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
                    >
                        <PackageCheck className="w-4 h-4" />
                        Recibir
                    </Link>
                    {/* Optional: Deep link to catalog if needed? */}
                    {/* <Link href="/inventory/catalog" className="text-sm font-bold text-slate-500 hover:text-slate-900">Ir al Catálogo</Link> */}
                </div>
            </div>

            {/* Strategic KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Inventory Value */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Total</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">
                            ${metrics.inventoryValue.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* 2. Total Units */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Package className="w-24 h-24 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Package className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">
                            {metrics.totalUnits}
                        </p>
                    </div>
                </div>

                {/* 3. Stagnant Capital (NEW) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Anchor className="w-24 h-24 text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                <Anchor className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Estancado</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">
                            ${metrics.stagnantCapital.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-red-400 font-bold mt-1">&gt; 30 días sin rotar</p>
                    </div>
                </div>

                {/* 4. Price Review */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revisión Precios</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-black text-slate-800">
                                {metrics.priceReviewCount}
                            </p>
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                Items
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS COMPONENT */}
            <DashboardCharts
                categoryData={metrics.categoryDistribution.map((d, i) => ({
                    ...d,
                    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'][i % 7]
                }))}
                historyData={metrics.historySeries}
            />

            {/* Opportunities Section */}
            {metrics.opportunities.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-emerald-900 uppercase tracking-wide">Oportunidades de Precio</h3>
                            <p className="text-xs text-emerald-600 font-bold">Costos subiendo, precios estáticos</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black uppercase text-emerald-400 tracking-wider border-b border-emerald-100">
                                    <th className="pb-3 pl-2">Producto</th>
                                    <th className="pb-3 text-right">Costo Prom.</th>
                                    <th className="pb-3 text-right">Último Costo</th>
                                    <th className="pb-3 text-right">Precio Actual</th>
                                    <th className="pb-3 text-right pr-2">Margen Actual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50">
                                {metrics.opportunities.map((op: any) => (
                                    <tr key={op.id} className="hover:bg-white/50 transition-colors">
                                        <td className="py-3 pl-2 font-bold text-slate-700">
                                            {op.name}
                                            <div className="text-[10px] text-slate-400 font-mono">{op.sku}</div>
                                        </td>
                                        <td className="py-3 text-right font-mono text-slate-500">${op.avgCost.toLocaleString()}</td>
                                        <td className="py-3 text-right font-mono text-red-500 font-bold">${op.lastCost.toLocaleString()}</td>
                                        <td className="py-3 text-right font-mono text-slate-800 font-bold">${op.currentPrice.toLocaleString()}</td>
                                        <td className="py-3 text-right pr-2">
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md font-bold text-xs">
                                                {op.marginPercent.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Replenishment Alerts (Filtered) */}
            {metrics.replenishmentAlerts.length > 0 && (
                <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <AlertOctagon className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-red-900 uppercase tracking-wide">Agotados (Reabastecer)</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {metrics.replenishmentAlerts.map((alert: any) => (
                            <div key={alert.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-slate-700">{alert.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded">{alert.sku}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
