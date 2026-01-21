
import { Suspense } from "react";
import Link from "next/link";
import { getDashboardMetrics } from "./actions";
import { formatCurrency } from "@/lib/utils";
import {
    Wallet,
    AlertTriangle,
    PiggyBank,
    ArrowRight,
    Phone,
    MoreVertical,
    TrendingUp,
    Users,
    ShieldCheck,
    Siren,
    MessageCircle
} from "lucide-react";
import ProjectionChart from "./components/ProjectionChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const metadata = {
    title: "Radar de Cobranzas | LATIDOS",
    description: "Monitoreo de riesgo y gestión de cartera.",
};

export default async function CollectionsDashboard({ searchParams }: { searchParams: { filter?: string } }) {
    const metrics = await getDashboardMetrics();
    const isCleanFilter = searchParams?.filter === 'clean';

    // Risk Calculation (> 15 days)
    const riskAmount = metrics.aging["16-30"] + metrics.aging["31-60"] + metrics.aging["+90"];

    // Filter Logic
    const displayedDebtors = isCleanFilter
        ? metrics.activeDebtors.filter(d => d.oldestInvoiceDays <= 5)
        : metrics.activeDebtors;

    return (
        <div className="w-full mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Radar de Cobranza
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide border border-slate-200">
                            Modo Lectura
                        </span>
                    </h1>
                    <p className="text-slate-500">Monitoreo de salud financiera y alertas de riesgo.</p>
                </div>
                <div className="flex gap-3">
                    <Link href={isCleanFilter ? "/sales/collections" : "/sales/collections?filter=clean"}>
                        <Button variant="outline" className={cn(
                            "font-bold border-2 transition-all",
                            isCleanFilter
                                ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-600"
                        )}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            {isCleanFilter ? "Ver Todos" : "Filtro: Deuda Limpia"}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                    title="Total por Cobrar"
                    value={metrics.totalReceivable}
                    icon={Wallet}
                    color="blue"
                    subtext="Cartera total pendiente"
                />
                <KpiCard
                    title="En Riesgo (>15 Días)"
                    value={riskAmount}
                    icon={Siren}
                    color="orange"
                    subtext="Gestión preventiva necesaria"
                    className={riskAmount > 0 ? "animate-pulse border-orange-400" : ""}
                />
                <KpiCard
                    title="Cartera Crítica (>30 Días)"
                    value={metrics.overdueDebt}
                    icon={AlertTriangle}
                    color="red"
                    subtext="Acción inmediata requerida"
                />
                <KpiCard
                    title="Saldo a Favor"
                    value={metrics.creditBalances}
                    icon={PiggyBank}
                    color="emerald"
                    subtext={`${metrics.customersWithCreditCount} clientes con saldo`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Aging & Segmentation */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Aging Semaphore */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Antigüedad de la Deuda</CardTitle>
                            <CardDescription>Clasificación por días de mora</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <AgingBar label="Por Vencer (0 - 15 días)" value={metrics.aging["1-15"]} total={metrics.totalReceivable} color="bg-emerald-500" />
                                <AgingBar label="Vencido (> 15 días)" value={metrics.aging["16-30"]} total={metrics.totalReceivable} color="bg-orange-500" />
                                <AgingBar label="Crítico (> 30 días)" value={metrics.aging["31-60"] + metrics.aging["+90"]} total={metrics.totalReceivable} color="bg-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Debtors Table */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Gestión de Clientes</CardTitle>
                                    <CardDescription>
                                        {isCleanFilter ? "Mostrando solo clientes con buen comportamiento (<5 días)" : "Listado completo de deudores"}
                                    </CardDescription>
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {displayedDebtors.length} Clientes
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4 text-center">Facturas</th>
                                            <th className="px-6 py-4 text-center">Mora Máx.</th>
                                            <th className="px-6 py-4 text-right">Deuda Total</th>
                                            <th className="px-6 py-4 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {displayedDebtors.map((debtor) => {
                                            const isRisk = debtor.oldestInvoiceDays > 15;
                                            const isCritical = debtor.oldestInvoiceDays > 30;

                                            return (
                                                <tr key={debtor.id} className={cn(
                                                    "hover:bg-slate-50 transition-colors group",
                                                    isRisk ? "bg-red-50/30" : ""
                                                )}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                            {debtor.name}
                                                        </div>
                                                        {isRisk && (
                                                            <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold animate-pulse mt-1">
                                                                <AlertTriangle className="w-3 h-3" /> ATENCIÓN REQUERIDA
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                                        {debtor.invoicesCount}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-xs font-black",
                                                            isCritical ? 'bg-red-100 text-red-700' :
                                                                isRisk ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-emerald-100 text-emerald-700'
                                                        )}>
                                                            {debtor.oldestInvoiceDays} días
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-800">
                                                        {formatCurrency(debtor.totalDebt)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                                                        {debtor.phone && (() => {
                                                            const name = debtor.name;
                                                            const total = debtor.totalDebt;
                                                            const invoices = debtor.invoices || [];

                                                            // Dynamic Categories based on Due Date
                                                            // invoices now have 'daysUntilDue'
                                                            const overdue = invoices.filter((i: any) => i.daysUntilDue < 0);
                                                            const upcoming = invoices.filter((i: any) => i.daysUntilDue >= 0 && i.daysUntilDue <= 7);
                                                            const recent = invoices.filter((i: any) => i.daysUntilDue > 7);

                                                            const sum = (arr: any[]) => arr.reduce((acc, curr) => acc + curr.balance, 0);

                                                            const totalOverdue = sum(overdue);
                                                            const totalUpcoming = sum(upcoming);
                                                            const totalRecent = sum(recent);

                                                            const fmt = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

                                                            let message = `👋 Hola *${name}*. Te compartimos el resumen detallado de tu cuenta con MR MOBILE:\n\n`;
                                                            message += `💰 *DEUDA TOTAL:* ${fmt(total)}\n\n`;

                                                            if (overdue.length > 0) {
                                                                message += `🚨 *VENCIDO (PAGO INMEDIATO):* ${fmt(totalOverdue)}\n`;
                                                                overdue.forEach((i: any) => {
                                                                    // Use absolute value for days overdue
                                                                    const daysOverdue = Math.abs(i.daysUntilDue);
                                                                    message += `▪ ${i.invoiceNumber || 'INV'}: ${fmt(i.balance)} ⏳ ${daysOverdue} días de mora\n`;
                                                                });
                                                                message += `\n`;
                                                            }

                                                            if (upcoming.length > 0) {
                                                                message += `⚠️ *PRÓXIMAS A VENCER (PROGRAMAR):* ${fmt(totalUpcoming)}\n`;
                                                                upcoming.forEach((i: any) => {
                                                                    message += `▪ ${i.invoiceNumber || 'INV'}: ${fmt(i.balance)} ⏳ Vence en ${i.daysUntilDue} días\n`;
                                                                });
                                                                message += `\n`;
                                                            }

                                                            if (recent.length > 0) {
                                                                message += `ℹ️ *EN PLAZO / RECIENTES:* ${fmt(totalRecent)}\n`;
                                                                recent.forEach((i: any) => {
                                                                    message += `▪ ${i.invoiceNumber || 'INV'}: ${fmt(i.balance)} (Vigente)\n`;
                                                                });
                                                                message += `\n`;
                                                            }

                                                            message += `Quedamos atentos a tu soporte de pago. ¡Gracias!`;

                                                            return (
                                                                <a
                                                                    href={`https://wa.me/57${debtor.phone}?text=${encodeURIComponent(message)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-md hover:shadow-green-200 active:scale-95 flex items-center justify-center"
                                                                    title="Enviar Resumen por WhatsApp"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" />
                                                                </a>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {displayedDebtors.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                                    <ShieldCheck className="w-10 h-10 opacity-20" />
                                                    <p>No se encontraron clientes en esta categoría.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Top Debtors & Tips */}
                <div className="space-y-6">
                    {/* Projection Chart */}
                    <ProjectionChart data={metrics.projection} />

                    <Card className="bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-500">
                                <AlertTriangle className="w-5 h-5" />
                                Top Deudores
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Mayor impacto en flujo de caja
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {metrics.topDebtors.map((debtor, index) => (
                                <div key={debtor.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-700">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-200 line-clamp-1">{debtor.name}</p>
                                            <p className="text-[10px] text-slate-500">{debtor.invoicesCount} facturas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-yellow-400 text-sm">{formatCurrency(debtor.totalDebt)}</p>
                                        <p className="text-[10px] text-slate-500">{debtor.oldestInvoiceDays} días</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Wallet className="w-5 h-5 opacity-80" />
                                ¿Necesitas Recaudar?
                            </h3>
                            <p className="text-blue-100 text-sm leading-relaxed mb-4">
                                Para registrar abonos, ve al módulo de Ventas, selecciona las facturas del cliente y usa el botón <b>"ABONAR"</b>.
                            </p>
                            <Link href="/sales">
                                <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold">
                                    Ir a Ventas
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, color, subtext, className }: { title: string, value: number, icon: any, color: string, subtext: string, className?: string }) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 border-blue-200",
        red: "text-red-600 bg-red-50 border-red-200",
        orange: "text-orange-600 bg-orange-50 border-orange-200",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-200"
    };

    return (
        <Card className={cn("border-l-4 shadow-sm", className,
            color === 'blue' ? 'border-l-blue-500' :
                color === 'red' ? 'border-l-red-500' :
                    color === 'orange' ? 'border-l-orange-500' :
                        'border-l-emerald-500'
        )}>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                    {title}
                    <div className={cn("p-1.5 rounded-lg", colors[color])}>
                        <Icon className="w-4 h-4" />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(value)}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{subtext}</p>
            </CardContent>
        </Card>
    );
}

function AgingBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-600">{label}</span>
                <span className="font-black text-slate-900">{formatCurrency(value)}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                <div
                    className={cn("h-full transition-all duration-500", color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[10px] text-right text-slate-400 font-mono">
                {percentage.toFixed(1)}% del total
            </div>
        </div>
    );
}
