"use client";

import { formatCurrency } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

interface AppliedPayment {
    invoice: string;
    amount: number;
    newBalance: number;
}

interface PaymentSummaryProps {
    appliedPayments: AppliedPayment[];
    totalAmount: number;
    remainingCredit: number;
}

export function PaymentSummary({ appliedPayments, totalAmount, remainingCredit }: PaymentSummaryProps) {
    return (
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Check className="text-emerald-400" /> Resumen de Operación
            </h3>

            <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-slate-300">
                    <span>Monto Recibido:</span>
                    <span className="text-xl font-bold text-white">{formatCurrency(totalAmount)}</span>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left text-slate-400">
                            <th className="p-3">Factura</th>
                            <th className="p-3 text-right">Abonado</th>
                            <th className="p-3 text-right">Nuevo Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {appliedPayments.map((p, i) => (
                            <tr key={i}>
                                <td className="p-3 font-medium">#{p.invoice}</td>
                                <td className="p-3 text-right text-emerald-400">
                                    {formatCurrency(p.amount)}
                                </td>
                                <td className="p-3 text-right text-slate-300">
                                    {formatCurrency(p.newBalance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {remainingCredit > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="text-emerald-400 font-bold text-sm">¡Saldo a Favor Generado!</p>
                        <p className="text-emerald-200 text-xs">
                            El cliente tiene un crédito de <span className="font-bold">{formatCurrency(remainingCredit)}</span> para futuras compras.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
