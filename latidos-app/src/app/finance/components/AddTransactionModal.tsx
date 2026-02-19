"use client";

import { useState, useEffect, useRef } from "react";
import { createTransaction, getPaymentAccounts, getUniqueCategories } from "@/app/finance/actions";
import { X, Loader2, DollarSign, Tag, Calendar, Check, ArrowDown, ArrowUp } from "lucide-react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/utils"; // Assuming this exists or I use local
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "INCOME" | "EXPENSE";
}

export function AddTransactionModal({ isOpen, onClose, type }: AddTransactionModalProps) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [accountId, setAccountId] = useState("");
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);

    // Autocomplete State
    const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const categoryInputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            getPaymentAccounts().then(setAccounts);
            getUniqueCategories(type).then(setUniqueCategories);
            setAmount("");
            setDescription("");
            setCategory("");
            setAccountId("");
            setIsPinModalOpen(false);
        }
    }, [isOpen, type]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawVal = parseInt(amount.replace(/\D/g, ''), 10);
        if (!rawVal || !accountId || !description) return;

        // Open PIN Modal instead of direct submit
        setIsPinModalOpen(true);
    };

    const handleSignatureSuccess = async (operator: { id: string, name: string }, pin: string) => {
        const rawVal = parseInt(amount.replace(/\D/g, ''), 10);

        setIsLoading(true);
        try {
            await createTransaction({
                amount: rawVal,
                type,
                description,
                category: category || "General",
                accountId,
                operatorId: operator.id,
                pin: pin
            });
            onClose();
        } catch (error) {
            // alert("Error: " + error); 
            // Better to use Sonner if available, but staying consistent with existing alert or add import
            alert("Error: " + error);
        } finally {
            setIsLoading(false);
        }
    };

    const isIncome = type === "INCOME";
    const colorClass = isIncome ? "bg-emerald-500 text-white" : "bg-rose-500 text-white";
    // const bgClass = isIncome ? "bg-emerald-50" : "bg-rose-50"; // Unused

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
                <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">

                    {/* Header */}
                    <div className={`${colorClass} p-6 flex justify-between items-start`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                {isIncome ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                                <span className="text-sm font-bold uppercase tracking-wider">
                                    {isIncome ? "Nuevo Ingreso" : "Nuevo Egreso"}
                                </span>
                            </div>
                            <p className="text-white/80 text-xs font-medium">
                                Registra un movimiento en tus cuentas
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* Amount */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Monto</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all placeholder:text-slate-300"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        const num = parseInt(raw, 10);
                                        setAmount(raw ? new Intl.NumberFormat('es-CO').format(num) : "");
                                    }}
                                />
                            </div>
                        </div>

                        {/* Account */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Cuenta Afectada</label>
                            <select
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                            >
                                <option value="">Seleccionar cuenta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Concepto</label>
                            <input
                                type="text"
                                placeholder="Ej. Pago de Arriendo, Inyección de Capital..."
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1" ref={categoryInputRef}>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Categoría {(isIncome ? "(Opcional)" : "(Opcional)")}</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Ej. Gastos Fijos"
                                    className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={category}
                                    onChange={e => {
                                        setCategory(e.target.value);
                                        setShowOptions(true); // Show options on type
                                    }}
                                    onFocus={() => setShowOptions(true)}
                                />
                                {/* Dropdown specific to filtered categories */}
                                {showOptions && (
                                    <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto overflow-x-hidden">
                                        {uniqueCategories
                                            .filter(c => c.toLowerCase().includes(category.toLowerCase()))
                                            .length > 0 ? (
                                            uniqueCategories
                                                .filter(c => c.toLowerCase().includes(category.toLowerCase()))
                                                .map(c => (
                                                    <div
                                                        key={c}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 break-words whitespace-normal border-b border-slate-50 last:border-b-0"
                                                        onClick={() => {
                                                            setCategory(c);
                                                            setShowOptions(false);
                                                        }}
                                                    >
                                                        {c}
                                                    </div>
                                                ))
                                        ) : category.trim() !== "" ? (
                                            <div
                                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 break-words whitespace-normal flex items-center justify-between"
                                                onClick={() => setShowOptions(false)}
                                            >
                                                <span>Crear <span className="font-bold text-slate-900 border border-slate-200 bg-white px-1.5 py-0.5 rounded ml-1 w-fit inline-block">{category}</span></span>
                                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-slate-400 italic">
                                                Escribe para ver sugerencias...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !amount || !accountId || !description}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isIncome ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'}`}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar"}
                        </button>

                    </form>
                </div>
            </div>

            <PinSignatureModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                onSuccess={handleSignatureSuccess}
                actionName={isIncome ? "Registrar Ingreso" : "Registrar Egreso"}
            />
        </>,
        document.body
    );
}
