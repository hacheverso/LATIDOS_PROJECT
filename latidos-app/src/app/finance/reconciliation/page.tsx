import { getCustomerStatement } from "../actions";
import { getRecentCustomersForAudit, getReconciliationDashboardMetrics } from "../actions";
import Link from "next/link";
import { ArrowLeft, Search, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ReconciliationFilters from "./ReconciliationFilters";
import StatementTable from "./StatementTable";
import ExportStatementButton from "./ExportStatementButton";
import ReconciliationDashboard from "./ReconciliationDashboard";
import ClientWrapper from "./ClientWrapper";

export default async function ReconciliationPage({ searchParams }: { searchParams: { clientId?: string, from?: string, to?: string } }) {
    const { clientId, from, to } = searchParams;

    // Fetch Statement if Client Selected
    let statement = null;
    let error = null;
    let recentCustomers: any[] = [];
    let metrics = { totalDebt: 0, paymentsToday: 0, pendingToReconcile: 0 };

    if (clientId) {
        try {
            statement = await getCustomerStatement(clientId, from, to);
        } catch (e: any) {
            error = e.message;
        }
    } else {
        recentCustomers = await getRecentCustomersForAudit();
        metrics = await getReconciliationDashboardMetrics();
    }

    return (
        <div className="w-full space-y-8 pb-20 animate-in fade-in">
            {/* Header: Always visible */}
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white dark:bg-[#1A1C1E] p-4 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm transition-colors">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/finance/reconciliation" className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter transition-colors">
                            Conciliación
                        </h1>
                    </div>
                </div>
                {/* Search / Selector */}
                <div className="w-full md:flex-1 md:max-w-2xl relative">
                    <ClientWrapper />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-400 p-4 rounded-xl flex items-center gap-2 font-bold animate-in slide-in-from-top-2 border border-red-100 dark:border-rose-500/20 transition-colors">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {!clientId && !error && (
                <ReconciliationDashboard recentCustomers={recentCustomers} metrics={metrics} />
            )}

            {statement && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Customer Summary & Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Summary Card */}
                        <div className="bg-slate-900 dark:bg-[#131517] text-white p-6 rounded-2xl md:col-span-1 relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-transparent dark:border-white/10 transition-colors">
                            <div className="relative z-10">
                                <h2 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{statement.customer.name}</h2>
                                <p className="text-slate-400 dark:text-slate-500 text-xs font-mono">{statement.customer.taxId}</p>
                            </div>
                            <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400">
                                {statement.customer.phone}
                            </div>
                            <div className="absolute top-4 right-4 opacity-10 dark:opacity-5">
                                <Search className="w-16 h-16" />
                            </div>
                        </div>

                        {/* KPI Widgets */}
                        <div className="bg-white dark:bg-[#1A1C1E] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-colors">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Total Facturado</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight transition-colors">
                                {formatCurrency(statement.summary.totalDebit)}
                            </span>
                        </div>

                        <div className="bg-white dark:bg-[#1A1C1E] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-colors">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Total Pagado</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight transition-colors">
                                {formatCurrency(statement.summary.totalCredit)}
                            </span>
                        </div>

                        {/* Difference / Balance */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between relative overflow-hidden transition-colors ${statement.summary.finalBalance > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'}`}>
                            <span className={`text-xs font-black uppercase tracking-widest mb-1 opacity-70 transition-colors ${statement.summary.finalBalance > 0 ? 'text-rose-800 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'}`}>
                                {statement.summary.finalBalance > 0 ? "Deuda Pendiente" : "Saldo a Favor"}
                            </span>
                            <span className={`text-2xl font-black tracking-tighter transition-colors ${statement.summary.finalBalance > 0 ? 'text-rose-900 dark:text-rose-500' : 'text-emerald-900 dark:text-emerald-500'}`}>
                                {formatCurrency(Math.abs(statement.summary.finalBalance))}
                            </span>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white dark:bg-[#1A1C1E] p-4 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm border-l-4 border-l-slate-900 dark:border-l-white/20 transition-colors">
                        <ReconciliationFilters />
                    </div>

                    {/* Statement Table (Dual Column & Floating Bar) */}
                    <StatementTable statement={statement} />
                </div>
            )}
        </div>
    );
}
