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
                    <Link href="/finance" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
                            Comisiones
                        </h1>
                        <p className="text-slate-500 font-medium capitalize">Período: {period}</p>
                    </div>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ventas Totales</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{formatMoney(globalSales)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Utilidad Neta</span>
                    </div>
                    <p className="text-3xl font-black text-green-600">{formatMoney(globalProfit)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-lg border border-purple-500/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg text-white">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-purple-200 uppercase tracking-widest">A Pagar (Comisiones)</span>
                    </div>
                    <p className="text-3xl font-black">{formatMoney(globalCommissions)}</p>
                </div>
            </div>

            {/* User Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Desglose por Usuario</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase text-[10px] tracking-wider">Ventas</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Total Vendido</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Costo</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Utilidad</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase text-[10px] tracking-wider">% Com.</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider bg-slate-100">Comisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {report.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{row.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{row.saleCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-600">
                                        {formatMoney(row.totalSales)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-400">
                                        {formatMoney(row.totalCost)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                                        {formatMoney(row.netProfit)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">
                                            {row.commissionRate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-purple-700 bg-purple-50/30">
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
