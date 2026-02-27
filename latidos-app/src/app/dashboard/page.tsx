import { getDashboardData } from "./actions";
import { SalesKPIWidget, SalesTrendWidget, LiquidityWidget, TopCategoriesWidget } from "./components/DashboardWidgets";
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
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    let data;
    try {
        data = await getDashboardData();
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        // Fallback or Empty State
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">No se pudo cargar el panel</h2>
                <p className="text-slate-500 max-w-md">
                    Esto puede ocurrir si tu organización no está configurada correctamente o no tienes permisos.
                </p>
                <div className="flex gap-3 mt-4">
                    <Link href="/login" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Panel de Control
                    </h1>
                    <p className="text-muted font-medium mt-1">Visión Holística &bull; {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
                    compactMillion
                    icon={Package}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />

                {/* Interactive Liquidity Breakdown */}
                <LiquidityWidget
                    bank={data.financials.balanceBank}
                    cash={data.financials.balanceCash}
                />

                {/* Cartera Total (Receivables) */}
                <ReceivablesWidget
                    total={data.receivables.total}
                    clean={data.receivables.clean}
                    overdue={data.receivables.overdue}
                />
            </div>

            {/* Gran Total Bar */}
            <div className="bg-slate-900 dark:bg-[#131517] border border-slate-800 dark:border-white/10 rounded-2xl p-3 shadow-md w-full flex flex-col md:flex-row items-center justify-center gap-3 transition-colors">
                <p className="text-xs font-bold text-muted uppercase tracking-widest">Capital Total Estimado</p>
                <div className="hidden md:block w-px h-4 bg-slate-700 dark:bg-white/10"></div>
                <p className="text-lg font-black text-white dark:text-white tracking-tight flex items-baseline gap-1">
                    <span className="text-sm text-slate-500 font-bold">$</span>
                    {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(data.financials.inventoryValue + data.financials.totalLiquidity + data.receivables.total)}
                </p>
            </div>

            {/* 3. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Interactive Trend Chart */}
                <SalesTrendWidget initialData={data.initialChartData} />

                {/* Top Categories */}
                <TopCategoriesWidget initialData={data.topCategories} />
            </div>

            {/* 4. Strategic Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-fr">
                {/* Active Logistics List */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1A1C1E] dark:to-[#131517] border border-white/60 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-xl dark:shadow-black/40 overflow-hidden flex flex-col h-full">
                    <div className="p-5 md:p-6 border-b border-white/30 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-xs md:text-sm tracking-wide flex items-center gap-2 truncate">
                            <Truck className="w-4 h-4 shrink-0 text-amber-500 dark:text-[#FFD700]" />
                            <span className="truncate">Logística Activa</span>
                        </h3>
                        <Link href="/logistics" className="text-xs font-bold text-blue-600 dark:text-[#00E5FF] hover:underline whitespace-nowrap ml-2">Ver Todo</Link>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-white/5 overflow-y-auto flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                        {data.logistics.recent.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted text-sm italic">
                                No hay entregas activas.
                            </div>
                        ) : (
                            data.logistics.recent.map((d) => (
                                <div key={d.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{d.customer}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={cn(
                                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap",
                                                d.status === "ON_ROUTE" ? "bg-amber-100 text-amber-700 dark:bg-[#FFD700]/20 dark:text-[#FFD700]" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-[#F5F5F5]"
                                            )}>
                                                {d.status === "ON_ROUTE" ? "En Ruta" : d.status}
                                            </span>
                                            {d.urgency === "CRITICAL" && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-[#FF3B30]/20 dark:text-[#FF3B30] uppercase whitespace-nowrap">Crítica</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-muted max-w-[100px] truncate">{d.address || "Sin dirección"}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Aging Alerts (Cuentas por Cobrar) */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1A1C1E] dark:to-[#131517] border border-white/60 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-xl dark:shadow-black/40 overflow-hidden flex flex-col h-full">
                    <div className="p-5 md:p-6 border-b border-white/30 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-xs md:text-sm tracking-wide flex items-center gap-2 truncate">
                            <Clock className="w-4 h-4 shrink-0 text-purple-500 dark:text-[#00E5FF]" />
                            <span className="truncate">Cartera Vencida</span>
                        </h3>
                        <Link href="/sales/collections" className="text-xs font-bold text-blue-600 dark:text-[#00E5FF] hover:underline whitespace-nowrap ml-2">Gestionar</Link>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col items-center justify-center flex-1 text-center min-h-[250px]">
                        <div className="bg-red-50 dark:bg-[#FF3B30]/10 text-red-600 dark:text-[#FF3B30] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                            &gt; 15 Días
                        </div>
                        <p className="text-xs font-bold text-muted mb-1 uppercase tracking-widest">Total en riesgo</p>
                        <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                            ${(data.agingTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-muted mt-4 px-2 max-w-[200px]">
                            Dinero con vencimiento prolongado. Acción prioritaria.
                        </p>
                    </div>
                </div>

                {/* Critical Stock Widget */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1A1C1E] dark:to-[#131517] border border-white/60 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-xl dark:shadow-black/40 overflow-hidden flex flex-col h-full">
                    <div className="p-5 md:p-6 border-b border-white/30 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-xs md:text-sm tracking-wide flex items-center gap-2 truncate">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 dark:text-[#FF3B30]" />
                            <span className="truncate">Stock Crítico (&lt;2)</span>
                        </h3>
                        <Link href="/inventory" className="text-xs font-bold text-blue-600 dark:text-[#00E5FF] hover:underline whitespace-nowrap ml-2">Ver Inventario</Link>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-white/5 overflow-y-auto flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                        {data.lowStockItems.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-emerald-600 dark:text-emerald-500 text-sm font-medium">
                                ¡Excelente! No hay stock crítico.
                            </div>
                        ) : (
                            data.lowStockItems.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between group gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-800 dark:text-white text-xs md:text-sm group-hover:text-red-600 dark:group-hover:text-[#FF3B30] transition-colors truncate" title={item.name}>{item.name}</p>
                                        <p className="text-[10px] text-muted font-mono mt-0.5 truncate">{item.sku}</p>
                                    </div>
                                    <div className="shrink-0 bg-red-50 text-red-700 dark:bg-[#FF3B30]/10 dark:text-[#FF3B30] px-2 py-1 rounded-md font-bold text-[10px] md:text-xs whitespace-nowrap border border-red-100 dark:border-[#FF3B30]/30 shadow-sm">
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
                "text-white shadow-md shadow-slate-200/50 dark:shadow-black/50"
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

function MetricCard({ title, value, isCurrency = false, compactMillion = false, icon: Icon, color, bgColor, suffix = "", trend, trendValue }: any) {
    const formattedValue = compactMillion && Number(value) >= 1000000 ? (
        <span>${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(value) / 1000000)}M</span>
    ) : isCurrency ? (() => {
        const formatted = formatCurrency(Number(value));
        const match = formatted.match(/^(.*)([.,]\d{3})$/);
        if (match && Number(value) >= 1000) {
            return (
                <>
                    <span>{match[1]}</span>
                    <span className="text-2xl text-slate-400 font-semibold opacity-70 ml-0.5">{match[2]}</span>
                </>
            );
        }
        return formatted;
    })() : value;

    // Determine font size based on length (approximation since formattedValue is JSX or string)
    const valString = String(value);
    const textSize = valString.length > 9 ? "text-3xl" : "text-4xl";

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1A1C1E] dark:to-[#131517] border border-white/60 dark:border-white/10 p-5 rounded-3xl shadow-sm dark:shadow-xl dark:shadow-black/40 flex flex-col gap-1 group hover:shadow-md transition-all relative overflow-hidden">
            {/* Row 1: Header */}
            <div className="flex items-center justify-between w-full z-10">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm dark:shadow-none dark:bg-white/5", bgColor, color)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#E0F7FA] uppercase tracking-widest">{title}</p>
                </div>
                {/* Optional Suffix/Badge on Right */}
                {suffix && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-[#00E5FF]/10 dark:text-[#00E5FF] px-2 py-0.5 rounded-full uppercase">{suffix}</span>}
            </div>

            {/* Row 2: Big Number */}
            <div className="mt-2 text-left z-10">
                <p className={cn("font-black text-foreground tracking-tight leading-none flex items-baseline", textSize)}>
                    {formattedValue}
                </p>
                {/* Fallback for zero/currency */}
                {value === 0 && isCurrency && <p className="text-[10px] text-slate-300 mt-1 font-medium">Sin movimientos</p>}
            </div>

            {/* Background Decor */}
            <div className={cn("absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl opacity-10 transition-all", color.replace('text-', 'bg-'))} />
        </div>
    );
}

function ReceivablesWidget({ total, clean, overdue }: { total: number; clean: number; overdue: number }) {
    const formattedTotal = total >= 1000000
        ? `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(total / 1000000)}M`
        : formatCurrency(total);

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1A1C1E] dark:to-[#131517] border border-white/60 dark:border-white/10 p-5 rounded-3xl shadow-sm dark:shadow-xl dark:shadow-black/40 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className="flex flex-col gap-1 z-10 w-full mb-2">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm dark:shadow-none bg-amber-50 dark:bg-white/5 text-amber-600 dark:text-[#F59E0B] relative">
                            <Users className="w-5 h-5 absolute" />
                            <span className="text-[10px] font-black absolute translate-x-3 translate-y-3 bg-amber-100 dark:bg-[#1A1C1E] border border-amber-200 dark:border-white/10 rounded-full w-4 h-4 flex items-center justify-center text-amber-700 dark:text-[#F59E0B]">$</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#E0F7FA] uppercase tracking-widest">Cartera Total</p>
                    </div>
                </div>
            </div>

            <div className="z-10 mt-1">
                <p className="font-black text-foreground tracking-tight leading-none flex items-baseline" style={{ fontSize: total.toString().length > 6 ? '1.875rem' : '2.25rem' }}>
                    {formattedTotal}
                </p>
                {total === 0 && <p className="text-[10px] text-slate-300 mt-1 font-medium">Sin cuentas por cobrar</p>}
            </div>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 z-10">
                <div>
                    <p className="text-[9px] font-bold text-muted uppercase">Limpia</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(clean).replace(',00', '')}
                    </p>
                </div>
                <div>
                    <p className="text-[9px] font-bold text-muted uppercase">Crítica</p>
                    <p className="text-sm font-bold text-red-600 dark:text-[#FF3B30]">
                        {formatCurrency(overdue).replace(',00', '')}
                    </p>
                </div>
            </div>

            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl opacity-10 bg-amber-500 transition-all" />
        </div>
    );
}
