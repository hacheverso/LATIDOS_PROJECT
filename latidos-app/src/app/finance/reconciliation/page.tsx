import { getCustomerStatement } from "../actions";
import { ClientSelector } from "@/app/sales/collections/ClientSelector";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Search, AlertCircle, ShoppingCart, Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ReconciliationFilters from "./ReconciliationFilters";
import StatementTable from "./StatementTable";
import ExportStatementButton from "./ExportStatementButton";

export default async function ReconciliationPage({ searchParams }: { searchParams: { clientId?: string, from?: string, to?: string } }) {
    const { clientId, from, to } = searchParams;

    let statement = null;
    let error = null;

    if (clientId) {
        try {
            statement = await getCustomerStatement(clientId, from, to);
        } catch (e: any) {
            error = e.message;
        }
    }

    return (
        <div className="w-full space-y-8 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/finance" className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                            Cuadre de Cuentas
                        </h1>
                        <p className="text-slate-500 font-medium">Conciliación de Clientes</p>
                    </div>
                </div>
            </div>

            {/* Selector Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    Seleccionar Cliente a Conciliar
                </label>
                <ClientWrapper />
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {statement && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Customer Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black uppercase tracking-tight">{statement.customer.name}</h2>
                                <div className="flex gap-4 mt-2 text-slate-400 font-mono text-sm">
                                    <span>NIT: {statement.customer.taxId}</span>
                                    <span>Tel: {statement.customer.phone}</span>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <Search className="w-32 h-32" />
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border-2 flex flex-col justify-center relative overflow-hidden ${statement.summary.finalBalance > 0 ? 'bg-red-50 border-red-100 text-red-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                            <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">
                                {statement.summary.finalBalance > 0 ? "Saldo Pendiente (Deuda)" : "Saldo a Favor (Cliente)"}
                            </span>
                            <span className="text-3xl font-black tracking-tighter">
                                {formatCurrency(Math.abs(statement.summary.finalBalance))}
                            </span>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <ReconciliationFilters />

                        <div className="flex gap-2">
                            <ExportStatementButton />
                        </div>
                    </div>

                    {/* Statement Table */}
                    <StatementTable movements={statement.movements} />

                    {/* Summary Footer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold uppercase text-slate-500 text-center">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            Total Facturado: <span className="text-slate-900 text-base block">{formatCurrency(statement.summary.totalDebit)}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            Total Pagado: <span className="text-emerald-600 text-base block">{formatCurrency(statement.summary.totalCredit)}</span>
                        </div>
                        {/* More breakdowns can go here */}
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple wrapper to handle client-side collection of ClientSelector which pushes to URL
import ClientWrapper from "./ClientWrapper";
