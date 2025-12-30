"use client";

import { useState, useEffect } from "react";
import { registerPayment } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";
import { X, DollarSign, CreditCard, Banknote, Smartphone, Repeat, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleId: string;
    balance: number;
    onSuccess: () => void;
}

export default function AddPaymentModal({ isOpen, onClose, saleId, balance, onSuccess }: AddPaymentModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("EFECTIVO");
    const [reference, setReference] = useState<string>("");
    const [accountId, setAccountId] = useState<string>("");
    const [accounts, setAccounts] = useState<{ id: string, name: string, type: string }[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            getPaymentAccounts().then(accs => {
                setAccounts(accs);
                // Preselect "Caja Principal" or first available
                const defaultAcc = accs.find((a: any) => a.name.includes("Principal")) || accs[0];
                if (defaultAcc) setAccountId(defaultAcc.id);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        // Parse "1.500.000" -> 1500000
        const val = parseInt(amount.replace(/\D/g, ''), 10);

        if (isNaN(val) || val <= 0) {
            setError("Monto inválido");
            return;
        }

        if (!accountId) {
            setError("Debes seleccionar una Cuenta de Destino");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await registerPayment({
                saleId,
                amount: val,
                method,
                reference: reference || undefined,
                accountId
            });
            onSuccess();
        } catch (e: any) {
            setError(e.message || "Error al registrar pago");
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
        { id: "TRANSFERENCIA", label: "Transferencia", icon: Smartphone },
        { id: "NOTA CRÉDITO", label: "Nota Crédito", icon: CreditCard },
        { id: "RETOMA", label: "Retoma", icon: Repeat },
    ];

    const getReferencePlaceholder = () => {
        if (method === "RETOMA") return "Modelo y Serial del equipo recibido";
        return "Ej. Comprobante #1234";
    };

    // Helper for rendering credit info
    const parsedAmount = parseInt(amount.replace(/\D/g, '') || "0", 10);
    const creditAmount = parsedAmount - balance;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 opacity-100 transition-all">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Registrar Abono</h2>
                        <p className="text-slate-400 text-sm font-medium mt-1">Saldo pendiente: <span className="text-white">${balance.toLocaleString()}</span></p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Monto a Pagar
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 font-bold text-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all"
                                placeholder="0"
                                autoFocus
                                value={amount}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    if (!raw) {
                                        setAmount("");
                                        return;
                                    }
                                    const num = parseInt(raw, 10);
                                    setAmount(new Intl.NumberFormat('es-CO').format(num));
                                }}
                            />
                        </div>
                        {balance > 0 && (
                            <button
                                onClick={() => setAmount(new Intl.NumberFormat('es-CO').format(balance))}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-2 uppercase tracking-wide flex items-center gap-1"
                            >
                                Pagar Total (${balance.toLocaleString()})
                            </button>
                        )}
                    </div>

                    {/* Credit Balance Hint */}
                    {creditAmount > 0 && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-green-100 p-1.5 rounded-full text-green-600 mt-0.5">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-green-700 uppercase tracking-wide">
                                    ¡Saldo a Favor Generado!
                                </span>
                                <span className="text-sm text-green-800">
                                    Esta transacción liquidará la factura y agregará un saldo de <span className="font-black">${creditAmount.toLocaleString()}</span> a la cuenta del cliente.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Account Selection (NEW) */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            <div className="flex items-center gap-1">
                                <Wallet className="w-3 h-3" />
                                Cuenta de Destino
                            </div>
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            value={accountId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setAccountId(newId);

                                // Auto-select Logic
                                const account = accounts.find(a => a.id === newId);
                                if (account) {
                                    const nameLower = account.name.toLowerCase();
                                    if (nameLower.includes("nota") && nameLower.includes("credito")) {
                                        setMethod("NOTA CRÉDITO");
                                    } else if (account.type === "BANK" || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi")) {
                                        setMethod("TRANSFERENCIA");
                                    } else if (account.type === "CASH" || nameLower.includes("caja") || nameLower.includes("efectivo")) {
                                        setMethod("EFECTIVO");
                                    }
                                }
                            }}
                        >
                            <option value="">-- Seleccionar --</option>
                            {accounts.map(acc => {
                                let icon = "🏦";
                                if (acc.type === 'CASH') icon = "💵";
                                else if (acc.name.toLowerCase().includes("nequi")) icon = "📱";

                                return (
                                    <option key={acc.id} value={acc.id}>
                                        {icon} {acc.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Method Selection */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Método de Pago
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentMethods.map((m) => {
                                const selectedAccount = accounts.find(a => a.id === accountId);
                                let isDisabled = false;

                                if (selectedAccount) {
                                    const nameLower = selectedAccount.name.toLowerCase();
                                    const isBank = selectedAccount.type === 'BANK' || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi");
                                    const isCash = selectedAccount.type === 'CASH' || nameLower.includes("caja") || nameLower.includes("efectivo");
                                    const isCreditNote = nameLower.includes("nota") && nameLower.includes("credito");

                                    if (isBank) {
                                        // Bank = ONLY Transfer
                                        if (m.id !== 'TRANSFERENCIA') isDisabled = true;
                                    } else if (isCash) {
                                        // Cash = ONLY Cash
                                        if (m.id !== 'EFECTIVO') isDisabled = true;
                                    } else if (isCreditNote) {
                                        // Note = ONLY Note
                                        if (m.id !== 'NOTA CRÉDITO') isDisabled = true;
                                    }
                                }

                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => !isDisabled && setMethod(m.id)}
                                        disabled={isDisabled}
                                        className={cn(
                                            "p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all",
                                            isDisabled
                                                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                                : method === m.id
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]"
                                                    : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                        )}
                                    >
                                        <m.icon className="w-4 h-4" />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Validation Helper Hint */}
                        {accountId && (
                            <p className="text-[10px] text-slate-400 mt-2 text-center italic">
                                Métodos bloqueados automáticamente según la cuenta elegida.
                            </p>
                        )}
                    </div>

                    {/* Reference Input */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Referencia (Opcional)
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                            placeholder={getReferencePlaceholder()}
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide rounded-xl flex items-center gap-2 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {loading ? "Procesando..." : "Confirmar Pago"}
                    </button>
                </div>
            </div>
        </div>
    );
}
