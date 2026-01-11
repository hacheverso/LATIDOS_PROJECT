"use client";

import { useState, useEffect } from "react";
import { registerUnifiedPayment } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";
import { X, DollarSign, CreditCard, Banknote, Smartphone, Repeat, Wallet, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Single Mode
    saleId?: string;
    balance?: number;
    // Bulk Mode
    invoiceIds?: string[];
    totalDebt?: number;
    // Shared
    customerCredit?: number;
    onSuccess: () => void;
}

export default function AddPaymentModal({
    isOpen,
    onClose,
    saleId,
    balance = 0,
    invoiceIds = [],
    totalDebt = 0,
    customerCredit = 0,
    onSuccess
}: AddPaymentModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("EFECTIVO");
    const [reference, setReference] = useState<string>("");
    const [accountId, setAccountId] = useState<string>("");
    const [accounts, setAccounts] = useState<{ id: string, name: string, type: string }[]>([]);

    // Determine Mode
    const isBulk = invoiceIds.length > 0;
    const targetIds = isBulk ? invoiceIds : (saleId ? [saleId] : []);
    const maxAmount = isBulk ? totalDebt : balance;

    // NEW STATE
    const [saveExcessAsCredit, setSaveExcessAsCredit] = useState(false);
    const [isAutoFilled, setIsAutoFilled] = useState(false); // Green highlight state

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
            // Reset states
            setAmount("");
            setMethod("EFECTIVO");
            setSaveExcessAsCredit(false);
            setIsAutoFilled(false);
            setShowOverpaymentWarning(false);
            setError(null);
        }
    }, [isOpen]);

    // KEYBOARD SHORTCUT: 'T' for Total
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 't' && isOpen) {
                e.preventDefault();
                setAmount(new Intl.NumberFormat('es-CO').format(maxAmount));
                setIsAutoFilled(true);
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, maxAmount]);

    const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);

    if (!isOpen) return null;

    const handleConfirmClick = () => {
        // Parse "1.500.000" -> 1500000
        const val = parseInt(amount.replace(/\D/g, ''), 10);

        if (isNaN(val) || val <= 0) {
            setError("Monto inválido");
            return;
        }

        if (method !== "SALDO A FAVOR" && !accountId) {
            setError("Debes seleccionar una Cuenta de Destino");
            return;
        }

        // Logic check for overpayment
        if (val > maxAmount) {
            setSaveExcessAsCredit(true); // Default to saving as credit as per updated requirement
            setShowOverpaymentWarning(true);
            return;
        }

        // Normal path
        executePayment(val, false);
    };

    const executePayment = async (val: number, forceCredit: boolean) => {
        setLoading(true);
        setError(null);

        try {
            await registerUnifiedPayment({
                invoiceIds: targetIds,
                amount: val,
                method,
                reference: reference || undefined,
                accountId: method === "SALDO A FAVOR" ? "" : accountId,
                saveExcessAsCredit: forceCredit ? true : saveExcessAsCredit
            });
            onSuccess();
        } catch (e: any) {
            setError(e.message || "Error al registrar pago");
            setShowOverpaymentWarning(false); // Reset on error
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
        if (method === "SALDO A FAVOR") return "Uso de saldo a favor del cliente";
        return "Ej. Comprobante #1234";
    };

    const parsedAmount = parseInt(amount.replace(/\D/g, '') || "0", 10);
    const surplus = parsedAmount - maxAmount;
    // Keyboard shortcut moved up to avoid hook error

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 opacity-100 transition-all relative">

                {/* OVERPAYMENT WARNING OVERLAY */}
                {showOverpaymentWarning && (
                    <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
                        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/20">
                            <Wallet className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase mb-2">
                            ¡Atención!
                        </h3>
                        <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                            Este monto supera la deuda actual. <br />
                            El sobrante de <strong className="text-emerald-600">${(parseInt(amount.replace(/\D/g, ''), 10) - maxAmount).toLocaleString()}</strong> se guardará automáticamente como <strong className="text-blue-600">Saldo a Favor</strong> del cliente.
                        </p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowOverpaymentWarning(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold uppercase text-xs hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => executePayment(parseInt(amount.replace(/\D/g, ''), 10), true)}
                                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                            >
                                Sí, Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className={cn("p-6 text-white flex justify-between items-start", isBulk ? "bg-blue-900" : "bg-slate-900")}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isBulk && <Layers className="w-5 h-5 text-blue-300" />}
                            <h2 className="text-xl font-black uppercase tracking-tight">
                                {isBulk ? "Abono Masivo" : "Registrar Abono"}
                            </h2>
                        </div>
                        <p className="text-white/70 text-sm font-medium">
                            {isBulk ? (
                                <span>Abonando a <strong className="text-white">{targetIds.length} facturas</strong>. Total: <span className="text-white">${maxAmount.toLocaleString()}</span></span>
                            ) : (
                                <span>Saldo pendiente: <span className="text-white">${maxAmount.toLocaleString()}</span></span>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* CREDIT USAGE ALERT */}
                    {customerCredit > 0 && method !== "SALDO A FAVOR" && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">Saldo Disponible</div>
                                    <div className="font-black text-emerald-800 text-lg">${customerCredit.toLocaleString()}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setMethod("SALDO A FAVOR");
                                    const toUse = Math.min(maxAmount, customerCredit);
                                    setAmount(new Intl.NumberFormat('es-CO').format(toUse));
                                }}
                                className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                USAR
                            </button>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                Monto a Pagar
                            </label>
                            {maxAmount > 0 && (
                                <button
                                    onClick={() => {
                                        setAmount(new Intl.NumberFormat('es-CO').format(maxAmount));
                                        setIsAutoFilled(true);
                                    }}
                                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                                    title="Atajo: Presiona 'T'"
                                >
                                    ✨ Pagar Total
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                className={`w-full pl-12 pr-4 py-4 rounded-xl border font-bold text-2xl focus:outline-none focus:ring-2 transition-all ${isAutoFilled
                                    ? "border-emerald-200 text-emerald-800 bg-emerald-50 focus:ring-emerald-500 focus:bg-white"
                                    : "border-slate-200 text-slate-800 bg-slate-50 focus:ring-slate-900 focus:bg-white"
                                    }`}
                                placeholder="0"
                                autoFocus
                                value={amount}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setIsAutoFilled(false); // Reset on manual edit
                                    if (!raw) {
                                        setAmount("");
                                        return;
                                    }
                                    const num = parseInt(raw, 10);
                                    setAmount(new Intl.NumberFormat('es-CO').format(num));
                                }}
                            />
                        </div>
                    </div>

                    {/* SURPLUS & CREDIT SAVING LOGIC */}
                    {surplus > 0 && !showOverpaymentWarning && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 uppercase">Excedente (A Saldo Favor)</span>
                                <span className="font-black text-blue-800 text-lg">${surplus.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-blue-400 mt-1">Este valor se acreditará al cliente.</p>
                        </div>
                    )}

                    {/* Account Selection */}
                    {method !== "SALDO A FAVOR" && (
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
                                    const account = accounts.find(a => a.id === newId);
                                    if (account) {
                                        const nameLower = account.name.toLowerCase();
                                        if (nameLower.includes("nota") && nameLower.includes("credito")) setMethod("NOTA CRÉDITO");
                                        else if (account.type === "BANK" || nameLower.includes("bancolombia") || nameLower.includes("nequi")) setMethod("TRANSFERENCIA");
                                        else if (account.type === "CASH") setMethod("EFECTIVO");
                                    }
                                }}
                            >
                                <option value="">-- Seleccionar --</option>
                                {accounts.map(acc => {
                                    let icon = "🏦";
                                    if (acc.type === 'CASH') icon = "💵";
                                    else if (acc.name.toLowerCase().includes("nequi")) icon = "📱";
                                    return <option key={acc.id} value={acc.id}>{icon} {acc.name}</option>;
                                })}
                            </select>
                        </div>
                    )}

                    {/* Method Selection */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Método de Pago
                        </label>

                        {method === "SALDO A FAVOR" ? (
                            <div className="bg-emerald-600 text-white p-4 rounded-xl flex items-center gap-3">
                                <Wallet className="w-6 h-6" />
                                <div>
                                    <div className="font-bold uppercase tracking-wide">Saldo a Favor del Cliente</div>
                                    <button
                                        onClick={() => {
                                            setMethod("EFECTIVO");
                                            setAmount("");
                                        }}
                                        className="text-xs underline opacity-80 hover:opacity-100"
                                    >
                                        Cambiar método
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map((m) => {
                                    const selectedAccount = accounts.find(a => a.id === accountId);
                                    let isDisabled = false;
                                    if (selectedAccount) {
                                        const nameLower = selectedAccount.name.toLowerCase();
                                        const isBank = selectedAccount.type === 'BANK' || nameLower.includes("bancolombia") || nameLower.includes("nequi");
                                        const isCash = selectedAccount.type === 'CASH' || nameLower.includes("caja") || nameLower.includes("efectivo");
                                        const isCreditNote = nameLower.includes("nota") && nameLower.includes("credito");

                                        if (isBank && m.id !== 'TRANSFERENCIA') isDisabled = true;
                                        else if (isCash && m.id !== 'EFECTIVO') isDisabled = true;
                                        else if (isCreditNote && m.id !== 'NOTA CRÉDITO') isDisabled = true;
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
                        )}
                        {accountId && method !== "SALDO A FAVOR" && (
                            <p className="text-[10px] text-slate-400 mt-2 text-center italic">
                                Métodos bloqueados según cuenta seleccionada.
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
                        onClick={handleConfirmClick}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Repeat className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : "Confirmar Pago"}
                    </button>
                </div>
            </div>
        </div>
    );
}
