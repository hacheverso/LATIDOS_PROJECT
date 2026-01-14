"use client";

import { useState, useEffect } from "react";
import { transferFunds, getPaymentAccounts } from "@/app/finance/actions";
import { X, Loader2, ArrowRightLeft, Wallet, ArrowRight } from "lucide-react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/utils";

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [fromId, setFromId] = useState("");
    const [toId, setToId] = useState("");
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getPaymentAccounts().then(setAccounts);
            setAmount("");
            setDescription("");
            setFromId("");
            setToId("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawVal = parseInt(amount.replace(/\D/g, ''), 10);

        if (!rawVal || !fromId || !toId || fromId === toId) return;

        setIsLoading(true);
        try {
            const res = await transferFunds(fromId, toId, rawVal, description);
            if (!res.success) throw new Error(res.error);
            onClose();
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="bg-indigo-600 text-white p-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                            <ArrowRightLeft className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wider">
                                Transferencia
                            </span>
                        </div>
                        <p className="text-white/80 text-xs font-medium">
                            Mover dinero entre cuentas internas
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Monto a Transferir</label>
                        <input
                            autoFocus
                            type="text"
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white transition-all placeholder:text-slate-300 text-center"
                            placeholder="0"
                            value={amount}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const num = parseInt(raw, 10);
                                setAmount(raw ? new Intl.NumberFormat('es-CO').format(num) : "");
                            }}
                        />
                    </div>

                    {/* From / To */}
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">Origen</label>
                            <select
                                className="w-full text-xs p-2 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                                value={fromId}
                                onChange={e => setFromId(e.target.value)}
                            >
                                <option value="">...</option>
                                {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === toId}>{a.name}</option>)}
                            </select>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 mt-4" />
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">Destino</label>
                            <select
                                className="w-full text-xs p-2 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                                value={toId}
                                onChange={e => setToId(e.target.value)}
                            >
                                <option value="">...</option>
                                {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === fromId}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nota (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Motivo..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-900"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !amount || !fromId || !toId}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Transferir"}
                    </button>

                </form>
            </div>
        </div>,
        document.body
    );
}
