import { getAccountDetails } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, Wallet, ArrowRightLeft, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import TransactionList from "./TransactionList";
import DateRangeFilter from "./DateRangeFilter";
import TransferButton from "./TransferButton";
import ExportButton from "./ExportButton";

export default async function AccountDetailPage({ params, searchParams }: { params: { id: string }, searchParams: { from?: string, to?: string } }) {
    const { id } = params;
    const { from, to } = searchParams;

    let data;
    try {
        data = await getAccountDetails(id, from, to);
    } catch (e) {
        redirect("/finance");
    }

    const { account, transactions, periodSummary } = data;

    return (
        <div className="w-full space-y-8 pb-20 animate-in fade-in">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/finance" className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                        {account.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {account.type}
                        </span>
                        <span className="text-slate-400 text-sm font-medium">Detalle de Cuenta</span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Balance */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Actual</div>
                        <div className="text-4xl font-black tracking-tight">
                            {formatCurrency(Number(account.balance))}
                        </div>
                    </div>
                    <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-800 opacity-50 rotate-12" />
                </div>

                {/* Period Income */}
                <div className="bg-emerald-50 text-emerald-900 p-8 rounded-3xl border border-emerald-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">
                            <TrendingUp className="w-4 h-4" />
                            Entradas (Periodo)
                        </div>
                        <div className="text-3xl font-black tracking-tight">
                            +{formatCurrency(periodSummary.income)}
                        </div>
                    </div>
                </div>

                {/* Period Expense */}
                <div className="bg-rose-50 text-rose-900 p-8 rounded-3xl border border-rose-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-widest mb-1">
                            <TrendingDown className="w-4 h-4" />
                            Salidas (Periodo)
                        </div>
                        <div className="text-3xl font-black tracking-tight">
                            -{formatCurrency(periodSummary.expense)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <DateRangeFilter />

                <TransferButton fromAccountId={account.id} accountName={account.name} maxAmount={Number(account.balance)} />
                <ExportButton transactions={transactions} accountName={account.name} />
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <TransactionList transactions={transactions} />
            </div>
        </div>
    );
}
