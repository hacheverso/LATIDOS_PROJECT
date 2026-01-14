import { getCustomerStatement } from "../actions";
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

    // 1. Dashboard State
    if (!clientId) {
        return <ReconciliationDashboard />;
    }

    // 2. Statement State
    let statement = null;
    let error = null;

    try {
        statement = await getCustomerStatement(clientId, from, to);
    } catch (e: any) {
        error = e.message;
    }

    return (
        <div className="w-full space-y-8 pb-20 animate-in fade-in">
            {/* Simple Header for Statement View */}
            <div className="flex items-center gap-4">
                <Link href="/finance/reconciliation" className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                        Conciliación
                    </h1>
                </div>
                {/* Compact Selector */}
                <div className="ml-auto w-64">
                    <ClientWrapper />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {statement && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Customer Summary & Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Summary Card */}
                        <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-1 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                            <div className="relative z-10">
                                <h2 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{statement.customer.name}</h2>
                                <p className="text-slate-400 text-xs font-mono">{statement.customer.taxId}</p>
                            </div>
                            <div className="relative z-10 text-xs text-slate-500">
                                {statement.customer.phone}
                            </div>
                            <div className="absolute top-4 right-4 opacity-10">
                                <Search className="w-16 h-16" />
                            </div>
                        </div>

                        {/* KPI Widgets */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Facturado</span>
                            <span className="text-2xl font-black text-slate-800 tracking-tight">
                                {formatCurrency(statement.summary.totalDebit)}
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pagado</span>
                            <span className="text-2xl font-black text-emerald-600 tracking-tight">
                                {formatCurrency(statement.summary.totalCredit)}
                            </span>
                        </div>

                        {/* Difference / Balance */}
                        <div className={`p-5 rounded-2xl border-2 flex flex-col justify-between relative overflow-hidden ${statement.summary.finalBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <span className={`text-xs font-black uppercase tracking-widest mb-1 opacity-70 ${statement.summary.finalBalance > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                                {statement.summary.finalBalance > 0 ? "Deuda Pendiente" : "Saldo a Favor"}
                            </span>
                            <span className={`text-2xl font-black tracking-tighter ${statement.summary.finalBalance > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                                {formatCurrency(Math.abs(statement.summary.finalBalance))}
                            </span>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-slate-900">
                        <ReconciliationFilters />

                        <div className="flex gap-2">
                            {/* Passed statement data to the button for client-side generation */}
                            <ExportStatementButton data={statement} />
                        </div>
                    </div>

                    {/* Statement Table */}
                    <StatementTable movements={statement.movements} />
                </div>
            )}
        </div>
    );
}
