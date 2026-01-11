import { formatCurrency } from "@/lib/utils";
import { ArrowRight, ArrowRightLeft } from "lucide-react";

export default function TransactionList({ transactions }: { transactions: any[] }) {
    if (transactions.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <ArrowRightLeft className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium text-lg">No hay movimientos en este periodo</p>
                <p className="text-sm opacity-70">Intenta cambiar los filtros de fecha</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest whitespace-nowrap">Fecha / Hora</th>
                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Descripción</th>
                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Categoría / Usuario</th>
                        <th className="px-6 py-4 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Entrada</th>
                        <th className="px-6 py-4 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Salida</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => {
                        const isIncome = tx.type === 'INCOME';
                        return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-slate-700">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700 leading-snug">{tx.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md self-start mb-1">
                                            {tx.category}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            Por: {tx.user?.name || 'Sistema'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isIncome && (
                                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                            +{formatCurrency(Number(tx.amount))}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!isIncome && (
                                        <span className="font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                                            -{formatCurrency(Number(tx.amount))}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
