"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Banknote, Filter, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleVerification } from "@/app/finance/actions";
import { toast } from "sonner"; // Assuming sonner is installed or uses simple alert

// 10
// 10
export default function StatementTable({ movements }: { movements: any[] }) {
    const [showOnlyPending, setShowOnlyPending] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Optimistic State
    const [optimisticVerifications, setOptimisticVerifications] = useState<Record<string, boolean>>({});

    const handleToggle = async (id: string, type: 'DEBIT' | 'CREDIT', currentStatus: boolean) => {
        // 1. Optimistic Update
        const newStatus = !currentStatus;
        setOptimisticVerifications(prev => ({ ...prev, [id]: newStatus }));

        try {
            // 2. Server Action (Background)
            const result = await toggleVerification(id, type, newStatus);
            if (!result.success) {
                // Revert on error
                alert("Error al actualizar: " + result.error);
                setOptimisticVerifications(prev => {
                    const next = { ...prev };
                    delete next[id]; // Revert to server state
                    return next;
                });
            }
        } catch (e) {
            alert("Error de conexión");
            setOptimisticVerifications(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    // Helper to get effective status
    const isVerified = (m: any) => {
        return optimisticVerifications[m.id] !== undefined
            ? optimisticVerifications[m.id]
            : m.isVerified;
    };

    // Filter First (using effective status)
    const filteredMovements = showOnlyPending
        ? movements.filter(m => !isVerified(m))
        : movements;

    // Then Sort
    const sortedMovements = useMemo(() => {
        return [...filteredMovements].sort((a, b) => {
            // Optimization: ISO strings are lexicographically sortable
            // This avoids parsing new Date() for every comparison
            return sortOrder === 'asc'
                ? (a.date > b.date ? 1 : -1)
                : (b.date > a.date ? 1 : -1);
        });
    }, [filteredMovements, sortOrder]);

    return (
        <div className="space-y-4">
            {/* ... keeping header ... */}
            <div className="flex justify-end">
                <div className="flex items-center gap-2">
                    <label htmlFor="pendingOnly" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                        Ver solo pendientes
                    </label>
                    <input
                        id="pendingOnly"
                        type="checkbox"
                        checked={showOnlyPending}
                        onChange={(e) => setShowOnlyPending(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-center w-12 text-slate-400">
                                    #
                                </th>
                                <th
                                    className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-left w-32 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                >
                                    <div className="flex items-center gap-1">
                                        FECHA
                                        <span className={`transition-transform text-slate-400 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                                            ▼
                                        </span>
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-left">Concepto</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right text-rose-500">Debe (Venta)</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right text-emerald-500">Haber (Pago)</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right w-40">Saldo</th>
                                <th className="px-4 py-3 text-center w-12 bg-emerald-50/50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4 mx-auto" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedMovements.map((move: any, index: number) => {
                                const checked = isVerified(move);
                                return (
                                    <tr
                                        key={move.id}
                                        className={`group transition-all duration-300 ${checked
                                            ? 'bg-slate-50 opacity-60 hover:opacity-100' // Visual feedback for checked
                                            : 'hover:bg-slate-50 text-slate-900'
                                            }`}
                                    >
                                        {/* Index */}
                                        <td className="px-4 py-3 text-center text-xs text-slate-300 font-mono">
                                            {index + 1}
                                        </td>

                                        <td className="px-6 py-4 font-medium whitespace-nowrap text-slate-600">
                                            {new Date(move.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${move.type === 'DEBIT' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                                                    {move.type === 'DEBIT' ? <ShoppingCart className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    {move.type === 'DEBIT' && move.detailsId ? (
                                                        <a href={`/sales/${move.detailsId}`} target="_blank" className="font-bold hover:text-blue-600 hover:underline transition-colors flex items-center gap-1 group/link">
                                                            {move.concept}
                                                        </a>
                                                    ) : (
                                                        <span className="font-bold">{move.concept}</span>
                                                    )}
                                                    {move.method && <span className="text-[10px] text-slate-400 font-bold tracking-wider">{move.method}</span>}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            {move.debit > 0 && (
                                                <span className="font-semibold text-rose-600">
                                                    {formatCurrency(move.debit)}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            {move.credit > 0 && (
                                                <span className="font-semibold text-emerald-600">
                                                    {formatCurrency(move.credit)}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-bold tabular-nums ${move.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(move.balance)}
                                            </div>
                                        </td>

                                        {/* Checkbox Column */}
                                        <td className={`px-4 py-3 text-center ${checked ? 'bg-emerald-50/30' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => handleToggle(move.id, move.type, checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer accent-emerald-500"
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                            {sortedMovements.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400 italic">
                                        {showOnlyPending ? "Todo conciliado 🎉" : "No hay movimientos en este periodo."}
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
