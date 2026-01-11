"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, ArrowDownLeft, ArrowUpRight, Receipt, Calendar } from "lucide-react";

interface CreditTransaction {
    id: string;
    date: string;
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
    referenceId?: string; // Payment or Sale ID
}

interface CreditHistoryTableProps {
    transactions: CreditTransaction[];
}

export default function CreditHistoryTable({ transactions }: CreditHistoryTableProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden mt-8">
            <div className="p-6 md:p-8 border-b border-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Historial de Saldo a Favor</h2>
                        <p className="text-sm font-medium text-slate-400">Movimientos de la billetera del cliente</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Wallet className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No hay movimientos de saldo registrados.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase text-xs tracking-wider">Fecha</th>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase text-xs tracking-wider">Concepto</th>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase text-xs tracking-wider text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {format(new Date(tx.date), "dd MMM yyyy", { locale: es })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 font-medium">{tx.description}</div>
                                        {tx.referenceId && <div className="text-xs text-slate-400 font-mono">Ref: {tx.referenceId.slice(0, 8)}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center gap-1 font-black px-2 py-1 rounded-lg text-xs ${tx.type === 'IN'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-red-50 text-red-600'
                                            }`}>
                                            {tx.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                            ${tx.amount.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
