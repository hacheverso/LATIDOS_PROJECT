"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Banknote, Filter, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleVerification } from "@/app/finance/actions";
import { toast } from "sonner"; // Assuming sonner is installed or uses simple alert

export default function StatementTable({ movements }: { movements: any[] }) {
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    const handleToggle = async (id: string, type: 'DEBIT' | 'CREDIT', currentStatus: boolean) => {
        try {
            const result = await toggleVerification(id, type, !currentStatus);
            if (!result.success) {
                alert("Error al actualizar: " + result.error);
            }
        } catch (e) {
            alert("Error de conexión");
        }
    };

    const displayedMovements = showOnlyPending
        ? movements.filter(m => !m.isVerified)
        : movements;

    return (
        <div className="space-y-4">
            {/* Local Filter Control */}
            <div className="flex justify-end">
                <div className="flex items-center gap-2">
                    <label htmlFor="pendingOnly" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                        Ver solo pendientes
                    </label>
                    <Checkbox
                        id="pendingOnly"
                        checked={showOnlyPending}
                        onCheckedChange={(c) => setShowOnlyPending(!!c)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">
                                    <CheckCircle2 className="w-4 h-4 text-slate-400 mx-auto" />
                                </th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-left w-32">Fecha</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-left">Concepto</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right text-rose-500">Debe (Venta)</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right text-emerald-500">Haber (Pago)</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right w-40">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedMovements.map((move: any) => (
                                <tr
                                    key={move.id}
                                    className={`group transition-all duration-300 ${move.isVerified
                                            ? 'bg-emerald-50/50 hover:bg-emerald-50 text-slate-400'
                                            : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <td className="px-4 py-3 text-center">
                                        <Checkbox
                                            checked={move.isVerified}
                                            onCheckedChange={() => handleToggle(move.id, move.type, move.isVerified)}
                                            className={move.isVerified ? "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" : ""}
                                        />
                                    </td>

                                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                                        {new Date(move.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${move.type === 'DEBIT' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'} ${move.isVerified ? 'opacity-50' : ''}`}>
                                                {move.type === 'DEBIT' ? <ShoppingCart className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                            </div>
                                            <span className="font-bold">{move.concept}</span>
                                        </div>
                                        {move.method && <div className="text-xs text-slate-400 ml-8">{move.method}</div>}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {move.debit > 0 && (
                                            <span className={`font-semibold ${move.isVerified ? 'text-rose-300' : 'text-rose-600'}`}>
                                                {formatCurrency(move.debit)}
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {move.credit > 0 && (
                                            <span className={`font-semibold ${move.isVerified ? 'text-emerald-300' : 'text-emerald-600'}`}>
                                                {formatCurrency(move.credit)}
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-bold tabular-nums ${move.balance > 0 ? 'text-rose-600' : 'text-emerald-600'} ${move.isVerified ? 'opacity-60' : ''}`}>
                                            {formatCurrency(move.balance)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {displayedMovements.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 italic">
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
