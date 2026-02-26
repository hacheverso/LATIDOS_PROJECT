"use client";

import { useState, useEffect, useMemo } from "react";
import { splitTransferFunds, getPaymentAccounts } from "@/app/finance/actions";
import { X, Loader2, ArrowRightLeft, Plus, Trash2, ArrowRight } from "lucide-react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/utils";
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SplitItem {
    id: string; // unique UI key
    accountId: string;
    amount: string; // Keep as string for input parsing
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
    const [totalAmountStr, setTotalAmountStr] = useState("");
    const [description, setDescription] = useState("");

    const [sources, setSources] = useState<SplitItem[]>([{ id: crypto.randomUUID(), accountId: "", amount: "" }]);
    const [destinations, setDestinations] = useState<SplitItem[]>([{ id: crypto.randomUUID(), accountId: "", amount: "" }]);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getPaymentAccounts().then(setAccounts);
            setTotalAmountStr("");
            setDescription("");
            setSources([{ id: crypto.randomUUID(), accountId: "", amount: "" }]);
            setDestinations([{ id: crypto.randomUUID(), accountId: "", amount: "" }]);
            setIsPinModalOpen(false);
        }
    }, [isOpen]);

    // Auto-sync single accounts with the total amount to pass validation automatically
    useEffect(() => {
        if (sources.length === 1 && sources[0].amount !== totalAmountStr) {
            setSources([{ ...sources[0], amount: totalAmountStr }]);
        }
    }, [totalAmountStr, sources]);

    useEffect(() => {
        if (destinations.length === 1 && destinations[0].amount !== totalAmountStr) {
            setDestinations([{ ...destinations[0], amount: totalAmountStr }]);
        }
    }, [totalAmountStr, destinations]);

    // Helpers
    const parseAmount = (val: string) => parseInt(val.replace(/\D/g, ''), 10) || 0;
    const formatInput = (val: string) => {
        const num = parseAmount(val);
        return num ? new Intl.NumberFormat('es-CO').format(num) : "";
    };

    const totalAmount = parseAmount(totalAmountStr);

    const sumSources = sources.reduce((sum, s) => sum + parseAmount(s.amount), 0);
    const sumDestinations = destinations.reduce((sum, d) => sum + parseAmount(d.amount), 0);

    const remainingSource = totalAmount - sumSources;
    const remainingDest = totalAmount - sumDestinations;

    const isSplit = sources.length > 1 || destinations.length > 1;

    // Validation
    const isValid = useMemo(() => {
        if (!totalAmount) return false;
        if (sumSources !== totalAmount || sumDestinations !== totalAmount) return false;
        if (sources.some(s => !s.accountId || parseAmount(s.amount) <= 0)) return false;
        if (destinations.some(d => !d.accountId || parseAmount(d.amount) <= 0)) return false;
        if (isSplit && !description.trim()) return false;
        return true;
    }, [totalAmount, sumSources, sumDestinations, sources, destinations, isSplit, description]);

    // Auto-complete logic for new rows
    const addSource = () => {
        const nextAmount = remainingSource > 0 ? remainingSource : 0;
        setSources([...sources, { id: crypto.randomUUID(), accountId: "", amount: formatInput(nextAmount.toString()) }]);
    };

    const addDestination = () => {
        const nextAmount = remainingDest > 0 ? remainingDest : 0;
        setDestinations([...destinations, { id: crypto.randomUUID(), accountId: "", amount: formatInput(nextAmount.toString()) }]);
    };

    const updateSource = (id: string, field: keyof SplitItem, value: string) => {
        setSources(sources.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const updateDestination = (id: string, field: keyof SplitItem, value: string) => {
        setDestinations(destinations.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const removeSource = (id: string) => {
        if (sources.length > 1) setSources(sources.filter(s => s.id !== id));
    };

    const removeDestination = (id: string) => {
        if (destinations.length > 1) setDestinations(destinations.filter(d => d.id !== id));
    };


    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setIsPinModalOpen(true);
    };

    const handleSignatureSuccess = async (operator: { id: string, name: string }, pin: string) => {
        setIsLoading(true);
        try {
            const mappedSources = sources.map(s => ({ accountId: s.accountId, amount: parseAmount(s.amount) }));
            const mappedDestinations = destinations.map(d => ({ accountId: d.accountId, amount: parseAmount(d.amount) }));

            const res = await splitTransferFunds(
                mappedSources,
                mappedDestinations,
                totalAmount,
                description,
                operator.id,
                pin
            );

            if (!res.success) throw new Error(res.error);
            onClose();
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
            setIsPinModalOpen(false);
        }
    };

    const getAccountBalance = (accId: string) => {
        const acc = accounts.find(a => a.id === accId);
        return acc ? Number(acc.balance) : null;
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
                <div className="relative bg-white dark:bg-[#131517] w-full max-w-2xl rounded-3xl shadow-2xl dark:shadow-none overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-6 flex justify-between items-start shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                <ArrowRightLeft className="w-5 h-5" />
                                <span className="text-sm font-bold uppercase tracking-wider">
                                    Transferencia Dividida
                                </span>
                            </div>
                            <p className="text-white/80 text-xs font-medium">
                                Mover dinero entre múltiples cuentas
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="overflow-y-auto w-full scrollbar-thin">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Amount */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Monto a Transferir Total</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-2xl text-2xl font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white dark:focus:bg-white/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-center"
                                    placeholder="0"
                                    value={totalAmountStr}
                                    onChange={e => setTotalAmountStr(formatInput(e.target.value))}
                                />
                            </div>

                            {/* Split Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                {/* Desktop Divider */}
                                <div className="hidden md:flex absolute inset-y-0 left-1/2 -ml-px w-px bg-slate-100 dark:bg-white/10 items-center justify-center">
                                    <div className="bg-slate-50 dark:bg-[#131517] p-1 border border-slate-100 dark:border-white/10 rounded-full z-10">
                                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                                    </div>
                                </div>

                                {/* EGRESO */}
                                <div className="space-y-3 z-20 bg-white dark:bg-[#131517]">
                                    <div className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-100/50 dark:border-rose-500/20">
                                        <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                            Egreso (Sale de)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addSource}
                                            className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                                        >
                                            <Plus className="w-3 h-3" /> Dividir
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {sources.map((source, index) => {
                                            const bal = getAccountBalance(source.accountId);
                                            return (
                                                <div key={source.id} className="flex flex-col gap-1 p-3 bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-xl shadow-sm dark:shadow-none relative group">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Cuenta {index + 1}</span>
                                                        {sources.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSource(source.id)}
                                                                className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select
                                                            className={`${sources.length === 1 ? 'w-full' : 'w-[60%]'} text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2 rounded-lg focus:ring-1 focus:ring-rose-500 outline-none`}
                                                            value={source.accountId}
                                                            onChange={e => updateSource(source.id, 'accountId', e.target.value)}
                                                        >
                                                            <option value="" className="dark:bg-[#131517]">Seleccionar...</option>
                                                            {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-[#131517]">{a.name}</option>)}
                                                        </select>
                                                        {sources.length > 1 && (
                                                            <input
                                                                type="text"
                                                                placeholder="$0"
                                                                className="w-[40%] text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2 rounded-lg focus:ring-1 focus:ring-rose-500 outline-none text-right animate-in fade-in placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                                value={source.amount}
                                                                onChange={e => updateSource(source.id, 'amount', formatInput(e.target.value))}
                                                            />
                                                        )}
                                                    </div>
                                                    {bal !== null && (
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-500 font-medium pl-1 mt-0.5">
                                                            Saldo: <span className={bal < parseAmount(source.amount) ? "text-rose-500 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300"}>{formatCurrency(bal)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Egreso Summary */}
                                    {sources.length > 1 && (
                                        <div className="flex justify-between items-center px-2 pt-1 border-t border-slate-100 dark:border-white/5 animate-in fade-in">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">Restante</span>
                                            <span className={`text-xs font-black ${remainingSource === 0 ? 'text-emerald-500 dark:text-emerald-400' : remainingSource < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {formatCurrency(remainingSource)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* INGRESO */}
                                <div className="space-y-3 z-20 bg-white dark:bg-[#131517]">
                                    <div className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-500/20">
                                        <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                            Ingreso (Entra a)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addDestination}
                                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                                        >
                                            <Plus className="w-3 h-3" /> Dividir
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {destinations.map((dest, index) => (
                                            <div key={dest.id} className="flex flex-col gap-1 p-3 bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-xl shadow-sm dark:shadow-none relative group">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Cuenta {index + 1}</span>
                                                    {destinations.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDestination(dest.id)}
                                                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <select
                                                        className={`${destinations.length === 1 ? 'w-full' : 'w-[60%]'} text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none`}
                                                        value={dest.accountId}
                                                        onChange={e => updateDestination(dest.id, 'accountId', e.target.value)}
                                                    >
                                                        <option value="" className="dark:bg-[#131517]">Seleccionar...</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-[#131517]">{a.name}</option>)}
                                                    </select>
                                                    {destinations.length > 1 && (
                                                        <input
                                                            type="text"
                                                            placeholder="$0"
                                                            className="w-[40%] text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-right animate-in fade-in placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                            value={dest.amount}
                                                            onChange={e => updateDestination(dest.id, 'amount', formatInput(e.target.value))}
                                                        />
                                                    )}
                                                </div>
                                                {/* Optional: Show incoming balance context? Not strictly necessary but could be nice. We will just show name for space for now */}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Ingreso Summary */}
                                    {destinations.length > 1 && (
                                        <div className="flex justify-between items-center px-2 pt-1 border-t border-slate-100 dark:border-white/5 animate-in fade-in">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">Restante</span>
                                            <span className={`text-xs font-black ${remainingDest === 0 ? 'text-emerald-500 dark:text-emerald-400' : remainingDest < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {formatCurrency(remainingDest)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                                    Nota {isSplit ? <span className="text-rose-500 dark:text-rose-400">(Obligatoria para transferencia dividida)</span> : "(Opcional)"}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Motivo de la transferencia..."
                                    className={`w-full p-3 bg-white dark:bg-black/20 border ${isSplit && !description.trim() ? 'border-rose-300 dark:border-rose-500/50 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-indigo-900 dark:focus:ring-indigo-500'} rounded-xl font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2`}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || !isValid}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-white/5 disabled:text-slate-500 dark:disabled:text-slate-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 disabled:hover:scale-100 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                        !totalAmount ? "Ingresa un monto" :
                                            sumSources !== totalAmount || sumDestinations !== totalAmount ? "Saldos no coinciden" :
                                                "Transferir"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>

            <PinSignatureModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                onSuccess={handleSignatureSuccess}
                actionName="Autorizar Transferencia"
            />
        </>,
        document.body
    );
}
