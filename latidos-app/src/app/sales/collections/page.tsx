
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
    Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata = {
    title: "Dashboard de Cobranzas | LATIDOS",
    description: "Gestión inteligente de cartera y recaudo.",
};

export default async function CollectionsDashboard() {
    const metrics = await getDashboardMetrics();

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard de Cartera</h1>
                    <p className="text-slate-500">Monitoreo de deudas, antigüedad y gestión de recaudo.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/sales/collections/process">
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-white font-bold h-12 px-6">
                            <Wallet className="mr-2 h-5 w-5" />
                            Ejecutar Motor de Cobranzas
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                    title="Cartera Total por Cobrar"
                    value={metrics.totalReceivable}
                    icon={TrendingUp}
                    color="blue"
                    subtext="Total deuda pendiente"
                />
                <KpiCard
                    title="Cartera Vencida (>30 días)"
                    value={metrics.overdueDebt}
                    icon={AlertTriangle}
                    color="red"
                    subtext="Atención prioritaria requerida"
                />
                <KpiCard
                    title="Saldo a Favor Clientes"
                    value={metrics.creditBalances}
                    icon={PiggyBank}
                    color="emerald"
                    subtext={`${metrics.customersWithCreditCount} clientes con saldo disponible`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Aging & Segmentation */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Aging Semaphore */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Antigüedad de la Deuda</CardTitle>
                            <CardDescription>Distribución de cartera por días de mora</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <AgingBar label="1 - 15 Días (Corriente)" value={metrics.aging["1-15"]} total={metrics.totalReceivable} color="bg-emerald-500" />
                                <AgingBar label="16 - 30 Días (Preventivo)" value={metrics.aging["16-30"]} total={metrics.totalReceivable} color="bg-yellow-500" />
                                <AgingBar label="31 - 60 Días (Vencido)" value={metrics.aging["31-60"]} total={metrics.totalReceivable} color="bg-orange-500" />
                                <AgingBar label="+90 Días (Crítico)" value={metrics.aging["+90"]} total={metrics.totalReceivable} color="bg-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Debtors Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestión de Cobranza</CardTitle>
                            <CardDescription>Listado de clientes con deuda activa</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Cliente</th>
                                            <th className="px-4 py-3 text-right">Facturas</th>
                                            <th className="px-4 py-3 text-right">Antigüedad</th>
                                            <th className="px-4 py-3 text-right">Deuda Total</th>
                                            <th className="px-4 py-3 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {metrics.activeDebtors.map((debtor) => (
                                            <tr key={debtor.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-900">{debtor.name}</td>
                                                <td className="px-4 py-3 text-right text-slate-500">{debtor.invoicesCount}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${debtor.oldestInvoiceDays > 30 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {debtor.oldestInvoiceDays} días
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                    {formatCurrency(debtor.totalDebt)}
                                                </td>
                                                <td className="px-4 py-3 text-center flex justify-center gap-2">
                                                    {debtor.phone && (
                                                        <a
                                                            href={`https://wa.me/57${debtor.phone}?text=${encodeURIComponent(`Hola ${debtor.name}, tienes un saldo pendiente de ${formatCurrency(debtor.totalDebt)} con LATIDOS. ¿Te envío el link de pago para ponerte al día?`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                            title="Enviar cobro por WhatsApp"
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <Link
                                                        href={`/sales/collections/process?customerId=${debtor.id}`}
                                                        className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                                        title="Ir a pagar"
                                                    >
                                                        <Wallet className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                        {metrics.activeDebtors.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                    ¡Excelente! No hay clientes con deuda pendiente.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Top Debtors */}
                <div className="space-y-8">
                    <Card className="bg-slate-900 text-white border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="text-yellow-400 w-5 h-5" />
                                Top Deudores
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Clientes con mayor deuda acumulada
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {metrics.topDebtors.map((debtor, index) => (
                                <div key={debtor.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-700">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{debtor.name}</p>
                                            <p className="text-xs text-slate-400">{debtor.invoicesCount} facturas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-yellow-400">{formatCurrency(debtor.totalDebt)}</p>
                                        <p className="text-[10px] text-slate-500">Mora: {debtor.oldestInvoiceDays} días</p>
                                    </div>
                                </div>
                            ))}
                            {metrics.topDebtors.length === 0 && (
                                <p className="text-slate-500 text-center py-4">Sin datos</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-lg mb-2">💡 Tip de Cobranza</h3>
                            <p className="text-blue-100 text-sm leading-relaxed">
                                "La gestión preventiva es clave. Contacta a los clientes 3 días antes de su fecha de corte para asegurar el pago."
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, color, subtext }: { title: string, value: number, icon: any, color: string, subtext: string }) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        red: "text-red-600 bg-red-50 border-red-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100"
    };

    return (
        <Card className={`border-l-4 ${color === 'blue' ? 'border-l-blue-500' : color === 'red' ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                    {title}
                    <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-500' : color === 'red' ? 'text-red-500' : 'text-emerald-500'}`} />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">
                    {formatCurrency(value)}
                </div>
                <p className="text-xs text-slate-500 mt-1">{subtext}</p>
            </CardContent>
        </Card>
    );
}

function AgingBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
