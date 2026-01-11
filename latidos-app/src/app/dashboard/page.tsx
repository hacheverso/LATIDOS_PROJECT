import { getDashboardData } from "./actions";
import { TopCategoriesChart } from "./components/DashboardCharts";
import { SalesKPIWidget, SalesTrendWidget, LiquidityWidget } from "./components/DashboardWidgets";
import Link from "next/link";
import {
    LayoutDashboard,
    ShoppingCart,
    Truck,
    Users,
    PackagePlus,
    Package,
    MapPin,
    AlertTriangle,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Visión Holística &bull; {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            </div>

            {/* 1. Quick Actions Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <QuickActionButton
                    href="/sales/new"
                    icon={ShoppingCart}
                    label="Nueva Venta"
                    color="bg-blue-600"
                />
                <QuickActionButton
                    href="/inventory/inbound"
                    icon={PackagePlus}
                    label="Recibir Mercancía"
                    color="bg-purple-600"
                />
                <QuickActionButton
                    href="/logistics"
                    icon={Truck}
                    label="Gestionar Rutas"
                    color="bg-amber-500"
                />
                <QuickActionButton
                    href="/directory/customers?action=new"
                    icon={Users}
                    label="Añadir Cliente"
                    color="bg-emerald-600"
                />
            </div>

            {/* 2. Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Interactive Sales KPI */}
                <SalesKPIWidget metrics={data.salesMetrics} />

                {/* Static Inventory Value */}
                <MetricCard
                    title="Valor Inventario"
                    value={data.financials.inventoryValue}
                    isCurrency
                    icon={Package}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />

                {/* Interactive Liquidity Breakdown */}
                <LiquidityWidget
                    bank={data.financials.balanceBank}
                    cash={data.financials.balanceCash}
                />

                {/* Static Logistics */}
                <MetricCard
                    title="Entregas Activas"
                    value={data.logistics.pending}
                    icon={MapPin}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    suffix="En Ruta"
                />
            </div>

            {/* 3. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Interactive Trend Chart */}
                <SalesTrendWidget initialData={data.initialChartData} />

                {/* Top Categories */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">
                            Top Categorías
                        </h3>
                        <span className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-600 rounded-full">30 Días</span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <TopCategoriesChart data={data.topCategories} />
                    </div>
                </div>
            </div>

            {/* 4. Strategic Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Logistics List */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/30 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-500" />
                            Logística Activa
                        </h3>
                        <Link href="/logistics" className="text-xs font-bold text-blue-600 hover:underline">Ver Todo</Link>
                    </div>
                    <div className="divide-y divide-slate-50 overflow-y-auto max-h-[300px]">
                        {data.logistics.recent.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm italic">No hay entregas activas.</div>
                        ) : (
                            data.logistics.recent.map((d) => (
                                <div key={d.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{d.customer}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                                d.status === "ON_ROUTE" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {d.status === "ON_ROUTE" ? "En Ruta" : d.status}
                                            </span>
                                            {d.urgency === "CRITICAL" && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Crítica</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 max-w-[120px] truncate">{d.address || "Sin dirección"}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Aging Alerts (Cuentas por Cobrar) */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/30 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            Cartera Vencida (&gt;15 Días)
                        </h3>
                        <Link href="/sales/collections" className="text-xs font-bold text-blue-600 hover:underline">Gestionar</Link>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center flex-1">
                        <p className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Total en riesgo</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tight">
                            ${data.agingTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-slate-500 mt-4 text-center px-4">
                            Este dinero tiene más de 15 días de vencimiento. <br /> Se recomienda acción inmediata.
                        </p>
                    </div>
                </div>

                {/* Critical Stock Widget */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/30 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Stock Crítico (&lt;2)
                        </h3>
                        <Link href="/inventory" className="text-xs font-bold text-blue-600 hover:underline">Ver Inventario</Link>
                    </div>
                    <div className="divide-y divide-slate-50 overflow-y-auto max-h-[300px]">
                        {data.lowStockItems.length === 0 ? (
                            <div className="p-8 text-center text-emerald-600 text-sm font-medium">
                                ¡Excelente! No hay stock crítico.
                            </div>
                        ) : (
                            data.lowStockItems.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm group-hover:text-red-600 transition-colors">{item.name}</p>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">{item.sku}</p>
                                    </div>
                                    <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg font-bold text-sm">
                                        {item.stock} Unid.
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS (Clean Code) ---

function QuickActionButton({ href, icon: Icon, label, color }: { href: string; icon: any; label: string; color: string }) {
    return (
        <Link
            href={href}
            className={cn(
                "group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95",
                color,
                "text-white shadow-md shadow-slate-200"
            )}
        >
            <div className="relative z-10 flex flex-col items-start gap-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Icon className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm uppercase tracking-wide">{label}</span>
            </div>
            {/* Glossy Effect */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-all" />
        </Link>
    );
}

function MetricCard({ title, value, isCurrency = false, icon: Icon, color, bgColor, suffix = "", trend, trendValue }: any) {
    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", bgColor, color)}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {isCurrency
                            ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : value
                        }
                    </p>
                    {suffix && <span className="text-xs font-bold text-slate-500">{suffix}</span>}
                </div>
                {/* Placeholder for Trend or extra info */}
                {value === 0 && isCurrency && <p className="text-[10px] text-slate-300">Sin movimientos</p>}
            </div>
        </div>
    );
}
