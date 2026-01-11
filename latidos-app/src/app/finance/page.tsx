import { getFinanceMetrics } from "./actions";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Plus,
    Landmark,
    Smartphone,
    Building2,
    CreditCard,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import AddAccountModal from "./AddAccountModal";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

function getAccountIcon(type: string, name: string) {
    const n = name.toLowerCase();
    if (n.includes("nequi") || n.includes("daviplata")) return <Smartphone className="w-6 h-6" />;
    if (type === "BANK" || n.includes("bancolombia") || n.includes("banco")) return <Landmark className="w-6 h-6" />;
    if (n.includes("oficina") || n.includes("principal")) return <Building2 className="w-6 h-6" />;
    if (type === "WALLET") return <Wallet className="w-6 h-6" />;
    if (type === "NOTA_CREDITO") return <CreditCard className="w-6 h-6" />;
    return <Wallet className="w-6 h-6" />;
}

function getAccountColor(type: string, name: string) {
    const n = name.toLowerCase();
    if (n.includes("nequi")) return "bg-purple-600 text-white";
    if (n.includes("bancolombia")) return "bg-yellow-400 text-black";
    if (type === "CASH") return "bg-emerald-500 text-white";
    return "bg-slate-900 text-white";
}

export default async function FinancePage() {
    const { accounts, totalAvailable, recentTransactions } = await getFinanceMetrics();

    return (
        <div className="w-full space-y-8 pb-20 fade-in animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                        Finanzas
                    </h1>
                    <p className="text-slate-500 font-medium">Control de Caja y Bancos</p>
                </div>
                <div className="flex items-center gap-3">
                    <AddAccountModal />
                </div>
            </div>

            {/* KPI: Total Available */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet className="w-48 h-48" />
                </div>
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Patrimonio Disponible</span>
                        <h2 className="text-5xl font-black mt-2 tracking-tight">
                            {formatCurrency(totalAvailable)}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Accounts Grid */}
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Landmark className="w-5 h-5 text-slate-400" />
                Mis Cuentas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => {
                    // @ts-ignore
                    const bal = Number(acc.balance);
                    const icon = getAccountIcon(acc.type, acc.name);
                    const colorClass = getAccountColor(acc.type, acc.name);

                    return (
                        <Link
                            key={acc.id}
                            href={`/finance/${acc.id}`}
                            className="group relative bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 block"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl shadow-lg shadow-current/20 ${colorClass}`}>
                                    {icon}
                                </div>
                                <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400">{acc.type}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-700 text-lg group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                    {acc.name}
                                </h4>
                                <p className={`text-2xl font-black mt-2 ${bal < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                    {formatCurrency(bal)}
                                </p>
                            </div>

                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 text-slate-300 group-hover:text-blue-500">
                                <ArrowRight className="w-6 h-6" />
                            </div>
                        </Link>
                    )
                })}

                {/* Empty State / Add New Card Placeholder if needed */}
            </div>

            {/* Recent Transactions Snippet */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                        Últimos Movimientos
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha</th>
                                <th className="px-8 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Descripción</th>
                                <th className="px-8 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Cuenta</th>
                                <th className="px-8 py-4 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {recentTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4 whitespace-nowrap text-slate-500 font-bold text-xs">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="font-bold text-slate-700">{tx.description}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1">{tx.category}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                                            {tx.account.name}
                                        </span>
                                    </td>
                                    <td className={`px-8 py-4 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                    </td>
                                </tr>
                            ))}
                            {recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic font-medium">
                                        No hay movimientos recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
