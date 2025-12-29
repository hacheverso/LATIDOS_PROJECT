import Link from "next/link";
import { Plus, PackageCheck, AlertTriangle, TrendingUp, AlertOctagon, DollarSign, Package, Anchor, Activity, Wallet } from "lucide-react";
import InventoryHeaderActions from "./InventoryHeaderActions";
import { DashboardCharts } from "./components/DashboardCharts";
import { getDashboardMetrics } from "./actions";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    const metrics = await getDashboardMetrics();

    // Helper formatter
    const fmt = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                        PANEL DE CONTROL DE INVENTARIO
                    </h1>
                    <p className="text-slate-500 font-medium">Centro de Acción Rápida</p>
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
                </div>
            </div>

            {/* KPI Banner (4 Cols) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Value */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Valor Total</p>
                        <p className="text-lg font-black text-slate-800">{fmt(metrics.inventoryValue)}</p>
                    </div>
                </div>
                {/* 2. Units */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Package className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Unidades</p>
                        <p className="text-lg font-black text-slate-800">{metrics.totalUnits}</p>
                    </div>
                </div>
                {/* 3. Global Margin */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Margen Prom.</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-lg font-black text-slate-800">{metrics.globalEfficiency.marginPct.toFixed(1)}%</p>
                            <span className="text-[9px] text-emerald-500 font-bold">Real</span>
                        </div>
                    </div>
                </div>
                {/* 4. Critical SKUs */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertOctagon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">SKUs Críticos</p>
                        <p className="text-lg font-black text-slate-800">{metrics.globalEfficiency.criticalSkus}</p>
                    </div>
                </div>
            </div>

            {/* ACTION CARD GRID (3 Cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* 1. TOP MÁRGENES (Victory Card) - Green */}
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-emerald-50 bg-emerald-50/30 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-black text-emerald-900 uppercase tracking-wide text-xs">Top Márgenes Reales</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">PROMOVER</span>
                    </div>
                    <div className="flex-1 p-0 overflow-y-auto max-h-[300px]">
                        {metrics.topMarginItems.map((item: any) => (
                            <div key={item.id} className="p-4 flex justify-between items-center hover:bg-emerald-50/10 border-b border-emerald-50/50 last:border-0">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-bold text-slate-700 text-xs truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-slate-400">Costo: <span className="text-slate-500 font-mono">{fmt(item.cost)}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-emerald-600 text-sm">{fmt(item.marginVal)}</p>
                                    <p className="text-[10px] font-bold text-emerald-400">{item.marginPct.toFixed(0)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. SMART RESTOCK (Critical Alerts) - Red */}
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertOctagon className="w-5 h-5 text-red-600" />
                            <h3 className="font-black text-red-900 uppercase tracking-wide text-xs">Smart Restock</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">Veloz & Agotado</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px]">
                        {metrics.smartRestock.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
                                <PackageCheck className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-xs italic">¡Excelente! No hay agotados de alta rotación.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-red-50">
                                {metrics.smartRestock.map((item: any) => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-red-50/10">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                                <p className="font-bold text-slate-700 text-xs truncate">{item.name}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono pl-3.5">{item.sku}</p>
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                            <p className="font-black text-red-600 text-sm">{item.velocity.toFixed(1)} <span className="text-[9px] font-normal text-red-400">u/sem</span></p>
                                            <p className="text-[9px] font-bold text-red-300 uppercase">Velocidad</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. RIGHT COL: PENDING & EFFICIENCY MIX */}
                <div className="flex flex-col gap-6 h-full">
                    {/* A. Pending Pricing */}
                    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden flex-1">
                        <div className="p-5 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                <h3 className="font-black text-orange-900 uppercase tracking-wide text-xs">Precios Pendientes</h3>
                            </div>
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">{metrics.pendingPricing.length}</span>
                        </div>
                        <div className="divide-y divide-orange-50">
                            {metrics.pendingPricing.map((item: any) => (
                                <div key={item.id} className="p-3 flex justify-between items-center group hover:bg-orange-50/20">
                                    <p className="font-bold text-slate-700 text-xs truncate flex-1 pr-2">{item.name}</p>
                                    <Link
                                        href={`/inventory/${item.id}`}
                                        className="px-3 py-1 bg-orange-100 text-orange-700 text-[9px] font-bold uppercase rounded-md hover:bg-orange-600 hover:text-white transition-all"
                                    >
                                        Fijar
                                    </Link>
                                </div>
                            ))}
                            {metrics.pendingPricing.length === 0 && (
                                <div className="p-4 text-center text-[10px] text-slate-400 italic">Todo al día.</div>
                            )}
                        </div>
                    </div>

                    {/* B. Efficiency & Stale Stats (Compact) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Stale Count */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <Anchor className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Estancado ({'>'}90d)</span>
                            </div>
                            <p className="text-xl font-black text-slate-700">{fmt(metrics.staleInventory.value)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Capital Congelado</p>
                        </div>

                        {/* Inventory Days */}
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-2 text-indigo-500">
                                <Activity className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Días de Stock</span>
                            </div>
                            <p className="text-xl font-black text-indigo-700">{metrics.globalEfficiency.inventoryDays.toFixed(0)} días</p>
                            <p className="text-[10px] text-indigo-400 mt-1">Cobertura Est.</p>
                        </div>

                        {/* Restock Cost */}
                        <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><Wallet className="w-3 h-3" /></div>
                                <span className="text-[10px] font-bold text-blue-800 uppercase">Costo Reposición (4 sem)</span>
                            </div>
                            <span className="font-black text-blue-700 text-sm">{fmt(metrics.globalEfficiency.replenishmentCost)}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* CHARTS COMPONENT */}
            <div className="w-full">
                <DashboardCharts
                    categoryData={metrics.categoryDistribution.map((d, i) => ({
                        ...d,
                        color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'][i % 7]
                    }))}
                    historyData={metrics.historySeries}
                />
            </div>
        </div>
    );
}
