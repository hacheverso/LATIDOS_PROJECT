"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SortKey = 'name' | 'invoicesCount' | 'oldestInvoiceDays' | 'totalDebt';

interface Debtor {
    id: string;
    name: string;
    companyName?: string | null;
    phone: string | null;
    invoicesCount: number;
    oldestInvoiceDays: number;
    totalDebt: number;
    invoices: any[];
}

interface ClientTableProps {
    displayedDebtors: Debtor[];
    isCleanFilter: boolean;
}

export default function CollectionsTable({ displayedDebtors, isCleanFilter }: ClientTableProps) {
    // Default sorting by max days overdue descending as requested
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: 'oldestInvoiceDays', direction: 'desc' });
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const sortedDebtors = useMemo(() => {
        let sortableDebtors = [...displayedDebtors];
        if (sortConfig !== null) {
            sortableDebtors.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableDebtors;
    }, [displayedDebtors, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name: SortKey) => {
        if (!sortConfig || sortConfig.key !== name) {
            return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400 opacity-50" />;
        }
        return sortConfig.direction === 'asc' ?
            <ArrowUp className="w-3 h-3 ml-1 text-emerald-600" /> :
            <ArrowDown className="w-3 h-3 ml-1 text-emerald-600" />;
    };

    return (
        <Card className="border-border shadow-sm overflow-hidden bg-surface">
            <CardHeader className="bg-slate-50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="dark:text-white">Gestión de Clientes</CardTitle>
                        <CardDescription className="dark:text-slate-400">
                            {isCleanFilter ? "Mostrando solo clientes con buen comportamiento (<5 días)" : "Listado completo de deudores"}
                        </CardDescription>
                    </div>
                    <div className="text-xs font-bold text-muted uppercase tracking-widest">
                        {sortedDebtors.length} Clientes
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white dark:bg-black/20 text-muted font-bold border-b border-slate-100 dark:border-white/5 select-none md:sticky md:top-0 z-10 shadow-sm">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => requestSort('name')}
                                >
                                    <div className="flex items-center">
                                        Cliente {getSortIcon('name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => requestSort('invoicesCount')}
                                >
                                    <div className="flex items-center justify-center">
                                        Facturas {getSortIcon('invoicesCount')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => requestSort('oldestInvoiceDays')}
                                >
                                    <div className="flex items-center justify-center">
                                        Mora Máx. {getSortIcon('oldestInvoiceDays')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => requestSort('totalDebt')}
                                >
                                    <div className="flex items-center justify-end">
                                        Deuda Total {getSortIcon('totalDebt')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {sortedDebtors.map((debtor) => {
                                const isRisk = debtor.oldestInvoiceDays > 15;
                                const isCritical = debtor.oldestInvoiceDays > 30;

                                return (
                                    <tr key={debtor.id} className={cn(
                                        "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                                        isRisk ? "bg-red-50/30 dark:bg-red-500/5" : ""
                                    )}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                <Link href={`/directory/customers/${debtor.id}`} className="hover:underline decoration-blue-400 decoration-2">
                                                    {debtor.name}
                                                </Link>
                                            </div>
                                            {debtor.companyName && (
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                                    {debtor.companyName}
                                                </div>
                                            )}
                                            {isRisk && (
                                                <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-bold animate-pulse mt-1">
                                                    <AlertTriangle className="w-3 h-3" /> ATENCIÓN REQUERIDA
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center text-muted font-medium">
                                            {debtor.invoicesCount}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-black",
                                                isCritical ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                                                    isRisk ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                                                        'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            )}>
                                                {debtor.oldestInvoiceDays} días
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">
                                            {formatCurrency(debtor.totalDebt)}
                                        </td>
                                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                                            {(() => {
                                                const name = debtor.name;
                                                const total = debtor.totalDebt;
                                                const invoices = debtor.invoices || [];

                                                // Dynamic Categories based on Due Date
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
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(message);
                                                            setCopiedId(debtor.id);
                                                            setTimeout(() => setCopiedId(null), 2000);
                                                        }}
                                                        className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-md hover:shadow-green-200 active:scale-95 flex items-center justify-center"
                                                        title="Copiar Resumen"
                                                    >
                                                        {copiedId === debtor.id ? <CheckCircle2 className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedDebtors.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted flex flex-col items-center gap-2">
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
    );
}
