import { getFinanceMetrics } from "./actions";
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, Plus } from "lucide-react";
import Link from "next/link";
import AddAccountModal from "./AddAccountModal";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const { accounts, totalAvailable, recentTransactions } = await getFinanceMetrics();

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                        Finanzas
                    </h1>
                    <p className="text-slate-500 font-medium">Flujo de Caja y Contabilidad</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/finance/new"
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Transacción
                    </Link>
                </div>
            </div>

            {/* KPI: Total Available */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet className="w-40 h-40" />
                </div>
                <div className="relative z-10">
                    <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Saldo Total Disponible</span>
                    <h2 className="text-5xl font-black mt-2 tracking-tight">
                        ${totalAvailable.toLocaleString()}
                    </h2>
                </div>
            </div>

            {/* Accounts Grid */}
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">Cuentas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${acc.type === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {acc.type === 'CASH' ? <Wallet className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
                            </div>
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">{acc.type}</span>
                        </div>
                        <h4 className="font-bold text-slate-700 text-lg">{acc.name}</h4>
                        <p className={`text-2xl font-black mt-1 ${Number(acc.balance) < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                            ${Number(acc.balance).toLocaleString()}
                        </p>
                    </div>
                ))}



                <AddAccountModal />
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Movimientos Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Cuenta</th>
                                <th className="px-6 py-3 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700">{tx.description}</div>
                                        <div className="text-xs text-slate-400">{tx.category}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                            {tx.account.name}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                        No hay movimientos registrados
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
