import { getCommissionsReport } from "./actions";
import { Wallet, TrendingUp, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils"; // Assuming helper exists or I create inline

const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
    const { report, period } = await getCommissionsReport();

    // KPI Globals
    const globalSales = report.reduce((acc, r) => acc + r.totalSales, 0);
    const globalProfit = report.reduce((acc, r) => acc + r.netProfit, 0);
    const globalCommissions = report.reduce((acc, r) => acc + r.commissionAmount, 0);

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/finance" className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase transition-colors">
                            Comisiones
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium capitalize transition-colors">Período: {period}</p>
                    </div>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1A1C1E] p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Ventas Totales</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800 dark:text-white transition-colors">{formatMoney(globalSales)}</p>
                </div>
                <div className="bg-white dark:bg-[#1A1C1E] p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 dark:bg-emerald-500/10 text-green-600 dark:text-emerald-400 rounded-lg transition-colors">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Utilidad Neta</span>
                    </div>
                    <p className="text-3xl font-black text-green-600 dark:text-emerald-400 transition-colors">{formatMoney(globalProfit)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 dark:from-purple-900/40 to-purple-800 dark:to-purple-900/20 text-white p-6 rounded-2xl shadow-lg border border-purple-500/50 dark:border-purple-500/20 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 dark:bg-purple-500/20 rounded-lg text-white dark:text-purple-300 transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-purple-200 dark:text-purple-400 uppercase tracking-widest transition-colors">A Pagar (Comisiones)</span>
                    </div>
                    <p className="text-3xl font-black text-white dark:text-purple-100 transition-colors">{formatMoney(globalCommissions)}</p>
                </div>
            </div>

            {/* User Table */}
            <div className="bg-white dark:bg-[#1A1C1E] rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-white/10 transition-colors">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wide transition-colors">Desglose por Usuario</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5 transition-colors">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">Usuario</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">Ventas</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">Total Vendido</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">Costo</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">Utilidad</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider transition-colors">% Com.</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider bg-slate-100 dark:bg-white/10 transition-colors">Comisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10 transition-colors">
                            {report.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors">{row.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">{row.saleCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400 transition-colors">
                                        {formatMoney(row.totalSales)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-400 dark:text-slate-500 transition-colors">
                                        {formatMoney(row.totalCost)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-green-600 dark:text-emerald-400 transition-colors">
                                        {formatMoney(row.netProfit)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded text-xs font-bold transition-colors">
                                            {row.commissionRate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-purple-700 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-500/5 transition-colors">
                                        {formatMoney(row.commissionAmount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
