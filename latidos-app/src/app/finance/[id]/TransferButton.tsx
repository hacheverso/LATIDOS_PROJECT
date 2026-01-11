"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPaymentAccounts, transferFunds } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TransferButtonProps {
    fromAccountId: string;
    accountName: string;
    maxAmount: number;
}

export default function TransferButton({ fromAccountId, accountName, maxAmount }: TransferButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);

    // Form State
    const [toAccountId, setToAccountId] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            getPaymentAccounts().then(res => {
                // Filter out current account
                setAccounts(res.filter((a: any) => a.id !== fromAccountId));
            });
            // Reset form
            setAmount("");
            setDescription("");
            setToAccountId("");
            setError(null);
        }
    }, [open, fromAccountId]);

    const handleTransfer = async () => {
        const val = parseFloat(amount.replace(/\D/g, '') || "0");

        if (!toAccountId) {
            setError("Selecciona una cuenta de destino");
            return;
        }
        if (val <= 0) {
            setError("Ingresa un monto válido");
            return;
        }
        if (val > maxAmount) {
            setError(`Fondos insuficientes (Máx: ${formatCurrency(maxAmount)})`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await transferFunds(fromAccountId, toAccountId, val, description);
            if (res.success) {
                setOpen(false);
                router.refresh(); // Refresh page to show new balance and transaction
            } else {
                setError(res.error || "Error al transferir");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs hover:bg-slate-800 hover:shadow-lg transition-all shadow-md">
                    <ArrowRightLeft className="w-4 h-4" />
                    Transferir Fondos
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6" />
                        Transferir Fondos
                    </DialogTitle>
                    <p className="text-slate-400 text-sm mt-1">
                        Desde: <strong className="text-white">{accountName}</strong>
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {/* To Account */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Cuenta Destino
                        </label>
                        <select
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={toAccountId}
                            onChange={e => setToAccountId(e.target.value)}
                        >
                            <option value="">-- Seleccionar --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                                Monto a Transferir
                            </label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                Disponible: {formatCurrency(maxAmount)}
                            </span>
                        </div>
                        <input
                            type="text"
                            placeholder="$0"
                            value={amount}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const num = parseInt(raw || "0", 10);
                                setAmount(new Intl.NumberFormat('es-CO').format(num));
                            }}
                            className="w-full p-3 text-lg font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Notas / Descripción
                        </label>
                        <input
                            type="text"
                            placeholder="Ej. Cierre de caja, Pago proveedores..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleTransfer}
                            disabled={loading}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? "Procesando..." : "Confirmar Transferencia"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
