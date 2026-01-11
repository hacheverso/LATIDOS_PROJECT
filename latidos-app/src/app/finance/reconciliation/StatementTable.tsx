"use client";

import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Banknote, CheckCircle2, Circle } from "lucide-react";
import { toggleVerification } from "@/app/finance/actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Movement {
    id: string;
    date: Date | string;
    concept: string;
    type: 'DEBIT' | 'CREDIT';
    method: string;
    debit: number;
    credit: number;
    balance: number;
    refId?: string;
    isVerified?: boolean;
}

export default function StatementTable({ movements }: { movements: Movement[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    // Optimistic state could be handled here or just rely on server revalidation (fast enough locally)

    // We keep local state for instant feedback while server catches up
    const [localVerified, setLocalVerified] = useState<Record<string, boolean>>(
        movements.reduce((acc, m) => ({ ...acc, [m.id]: !!m.isVerified }), {})
    );

    const handleToggle = async (id: string, type: 'DEBIT' | 'CREDIT') => {
        const current = localVerified[id];
        const next = !current;

        // Optimistic Update
        setLocalVerified(prev => ({ ...prev, [id]: next }));

        // Server Action
        const res = await toggleVerification(id, type, next);
        if (!res.success) {
            // Revert if failed
            setLocalVerified(prev => ({ ...prev, [id]: current }));
            alert("Error al verificar: " + res.error);
        } else {
            startTransition(() => {
                router.refresh();
            });
        }
    };

    if (movements.length === 0) {
        return <div className="p-8 text-center text-slate-400 italic">No hay movimientos en este periodo.</div>;
    }

    return (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-center font-black text-slate-400 uppercase text-[10px] tracking-widest w-12">
                            <span className="sr-only">Verificado</span>
                        </th>
                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-center font-black text-slate-400 uppercase text-[10px] tracking-widest w-12">Detalle</th>
                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Concepto</th>

                        <th className="px-6 py-4 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest bg-slate-100/50">Debe (+)</th>
                        <th className="px-6 py-4 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest bg-slate-100/50">Haber (-)</th>
                        <th className="px-6 py-4 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest">Saldo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {movements.map((move, idx) => {
                        const isDebit = move.type === 'DEBIT';
                        const verified = localVerified[move.id];

                        return (
                            <tr
                                key={`${move.id}-${idx}`}
                                className={`transition-all duration-300 group ${verified ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}
                            >
                                <td className="px-6 py-3 text-center">
                                    <button
                                        onClick={() => handleToggle(move.id, move.type)}
                                        disabled={isPending}
                                        className={`transition-all ${verified ? 'text-emerald-500 scale-110' : 'text-slate-200 hover:text-slate-400'}`}
                                        title={verified ? "Verificado" : "Marcar como verificado"}
                                    >
                                        {verified ? <CheckCircle2 className="w-5 h-5 fill-emerald-100" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-xs font-bold ${verified ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {new Date(move.date).toLocaleDateString()}
                                    <span className="block text-[10px] font-normal opacity-60">
                                        {new Date(move.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors ${verified ? 'grayscale opacity-50 bg-slate-100' : (isDebit ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600')}`}>
                                        {isDebit ? <ShoppingCart className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className={`font-bold transition-colors ${verified ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                        {move.concept}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">{move.method}</div>
                                </td>

                                <td className="px-6 py-3 text-right font-mono font-medium text-slate-400 bg-slate-50/30">
                                    {move.debit > 0 && (
                                        <span className={`font-bold ${verified ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {formatCurrency(move.debit)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right font-mono font-medium text-slate-400 bg-slate-50/30">
                                    {move.credit > 0 && (
                                        <span className={`font-bold ${verified ? 'text-slate-400' : 'text-emerald-600'}`}>
                                            {formatCurrency(move.credit)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className={`font-black font-mono text-sm ${verified ? 'opacity-50' : ''} ${move.balance > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                        {formatCurrency(move.balance)}
                                    </div>
                                    {move.balance < 0 && (
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">A Favor</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
}
