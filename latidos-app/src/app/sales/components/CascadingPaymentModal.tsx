import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Layers, CheckCircle2 } from "lucide-react";
import { processCascadingPayment, getCustomerCredit } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";
import { formatCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";

interface CascadingPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoices: any[]; // Expects array of invoice objects
    onSuccess: () => void;
}

export default function CascadingPaymentModal({ isOpen, onClose, selectedInvoices, onSuccess }: CascadingPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<{ id: string, name: string, type: string, balance: any }[]>([]);
    const [customerCredit, setCustomerCredit] = useState(0);
    const [step, setStep] = useState<'form' | 'confirm'>('form');

    // Form Stats
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("EFECTIVO");
    const [accountId, setAccountId] = useState<string>("");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [saveExcessAsCredit, setSaveExcessAsCredit] = useState(true);

    // Load Accounts & Credit
    useEffect(() => {
        if (isOpen) {
            getPaymentAccounts().then(setAccounts);
            if (selectedInvoices.length > 0) {
                getCustomerCredit(selectedInvoices[0].customer.id).then(setCustomerCredit);
            }
            // Reset form
            setAmount("");
            setReference("");
            setNotes("");
            setAccountId("");
            setMethod("EFECTIVO");
            setSaveExcessAsCredit(true);
            setStep('form');
        }
    }, [isOpen, selectedInvoices]);

    // --- FILTERING & SORTING LOGIC ---
    const filteredAccounts = useMemo(() => {
        let filtered = accounts.filter(acc => {
            const nameLower = acc.name.toLowerCase();
            const type = acc.type;

            if (method === "EFECTIVO") {
                return type === 'CASH' || nameLower.includes("caja") || nameLower.includes("efectivo") || nameLower.includes("oficina");
            }
            if (method === "TRANSFERENCIA") {
                return type === 'BANK' || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi");
            }
            if (method === "NOTA CRÉDITO") {
                return nameLower.includes("garant") || nameLower.includes("nc") || type === 'NOTA_CREDITO';
            }
            if (method === "RETOMA") {
                return nameLower.includes("retoma") || type === 'RETOMA';
            }
            return false;
        });

        // SORTING
        return filtered.sort((a, b) => {
            // 1. Priority: "Efectivo / Caja / Saldo Oficina"
            const isAPriority = /efectivo|caja|oficina/i.test(a.name);
            const isBPriority = /efectivo|caja|oficina/i.test(b.name);
            if (isAPriority && !isBPriority) return -1;
            if (!isAPriority && isBPriority) return 1;

            // 2. Balance Descending
            const balA = Number(a.balance) || 0;
            const balB = Number(b.balance) || 0;
            return balB - balA;
        });
    }, [accounts, method]);

    // --- AUTO SELECTION ---
    useEffect(() => {
        if (method !== "SALDO A FAVOR" && filteredAccounts.length > 0) {
            // Auto-select the first one (highest priority/balance)
            setAccountId(filteredAccounts[0].id);
        } else if (method !== "SALDO A FAVOR" && filteredAccounts.length === 0) {
            setAccountId("");
        }
    }, [method, filteredAccounts]);


    // Format & Parse Amount
    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, "")) || 0;

    // Calculation Logic
    const paymentPreview = useMemo(() => {
        // 1. Sort Oldest First
        const sorted = [...selectedInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 2. Distribute
        let remaining = numericAmount;

        // If method is SALDO A FAVOR, we cap usage at total pending to avoid "phantom surplus"
        const totalPending = sorted.reduce((acc, inv) => acc + (inv.total - inv.amountPaid), 0);
        if (method === "SALDO A FAVOR" && remaining > totalPending) {
            remaining = totalPending;
        }

        const distribution = sorted.map(inv => {
            const pending = inv.total - inv.amountPaid;
            const pay = Math.min(pending, remaining);
            remaining = Math.max(0, remaining - pay);

            return {
                id: inv.id,
                ref: inv.invoiceNumber || inv.id.slice(0, 8),
                date: inv.date,
                total: inv.total,
                pending,
                pay,
                newPending: pending - pay
            };
        });

        // Remaining here is legitimate surplus (if Cash) or 0 (if Credit capped)
        let surplus = 0;
        if (method !== "SALDO A FAVOR") {
            const totalPay = distribution.reduce((acc, d) => acc + d.pay, 0);
            surplus = Math.max(0, numericAmount - totalPay);
        }

        return {
            distribution,
            remaining: surplus
        };

    }, [selectedInvoices, numericAmount, method]);

    const totalDebt = selectedInvoices.reduce((acc, inv) => acc + (inv.total - inv.amountPaid), 0);

    const handleConfirm = async () => {
        if (!numericAmount || numericAmount <= 0) return alert("Ingrese un monto válido");
        if (!accountId && method !== "SALDO A FAVOR") return alert("Seleccione una cuenta de destino");

        if (step === 'form') {
            setStep('confirm');
            return;
        }

        setLoading(true);
        try {
            await processCascadingPayment({
                invoiceIds: selectedInvoices.map(i => i.id),
                totalAmount: numericAmount,
                method,
                accountId: method === "SALDO A FAVOR" ? "" : accountId,
                reference,
                notes,
                saveExcessAsCredit
            });
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#34d399', '#fbbf24', '#3b82f6'] // Emerald, Amber, Blue
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="bg-slate-900 p-6 border-b border-slate-800 flex-shrink-0 text-white">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="bg-white/10 p-2.5 rounded-xl text-emerald-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block text-xl font-black uppercase tracking-tight">Abono Masivo</span>
                            <span className="block text-xs font-medium text-slate-400">Abonando a <span className="text-white font-bold">{selectedInvoices.length} facturas</span>. Total: <span className="text-emerald-400 font-bold">{formatCurrency(totalDebt)}</span></span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {step === 'form' ? (
                        <>
                            {/* CUSTOMER CREDIT ALERT */}
                            {customerCredit > 0 && method !== "SALDO A FAVOR" && (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in zoom-in-95">
                                    <div>
                                        <h4 className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wide">
                                            <Wallet className="w-4 h-4" /> Saldo Disponible
                                        </h4>
                                        <p className="text-emerald-600/80 text-xs font-medium mt-1">
                                            El cliente tiene <strong>{formatCurrency(customerCredit)}</strong> a favor.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setMethod("SALDO A FAVOR");
                                            setAccountId("");
                                            const prepay = Math.min(totalDebt, customerCredit);
                                            setAmount(prepay.toLocaleString('es-CO'));
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-200 font-bold"
                                    >
                                        USAR
                                    </Button>
                                </div>
                            )}

                            {/* 1. MONTO A PAGAR (First Priority) */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Monto a Pagar</label>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] bg-blue-50 text-blue-600" onClick={() => setAmount(totalDebt.toLocaleString('es-CO'))}>⚡ Pagar Total</Button>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
                                    <input
                                        type="text"
                                        autoFocus
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                                        placeholder="0"
                                        value={amount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setAmount(val ? parseInt(val).toLocaleString('es-CO') : "");
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 2. CUSTOMER CREDIT USAGE WARNING or METHOD SELECTOR */}
                            {method === "SALDO A FAVOR" ? (
                                <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 p-6 rounded-2xl text-center space-y-3">
                                    <h4 className="text-emerald-800 font-black text-lg uppercase tracking-tight">Usando Saldo a Favor</h4>
                                    <p className="text-emerald-600 text-sm">Se descontará del crédito del cliente. No requiere cuenta de destino.</p>
                                    <Button variant="outline" onClick={() => setMethod("EFECTIVO")} className="border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                                        Cambiar Método
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* 3. MÉTODO DE PAGO */}
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Método de Pago</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {["EFECTIVO", "TRANSFERENCIA", "NOTA CRÉDITO", "RETOMA"].map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMethod(m)}
                                                    className={`p-3 rounded-xl border-2 text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${method === m
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {method === m && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 4. CUENTA DE DESTINO (Filtered) */}
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                            <Wallet className="w-3 h-3" /> Cuenta de Destino
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 font-bold text-sm text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-0 bg-white appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                                                value={accountId}
                                                onChange={(e) => setAccountId(e.target.value)}
                                            >
                                                {filteredAccounts.length === 0 && <option value="">-- No hay cuentas disponibles --</option>}
                                                {filteredAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.type === 'BANK' || acc.name.match(/bancolombia|nequi|davi/i) ? '🏦' : '💵'} {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Chevron */}
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1.5 italic text-right">
                                            {filteredAccounts.length > 0
                                                ? `Mostrando ${filteredAccounts.length} cuentas aceptadas para ${method}`
                                                : "No hay cuentas configuradas para este método."}
                                        </p>
                                    </div>

                                    {/* 5. Referencia */}
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Referencia (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            placeholder="Ej. Comprobante #1234"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Previsualización */}
                            {numericAmount > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                    <div className="px-4 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-100/50">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Distribución</span>
                                        {paymentPreview.remaining > 0 && method !== "SALDO A FAVOR" && (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                                Excedente: {formatCurrency(paymentPreview.remaining)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <tbody className="divide-y divide-slate-100">
                                                {paymentPreview.distribution.filter(d => d.pay > 0).map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-2 text-slate-600">
                                                            #{item.ref}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-bold text-blue-600">
                                                            {formatCurrency(item.pay)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-400">
                                                            Restan: {formatCurrency(item.newPending)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                Confirmar Abono Masivo
                            </h3>

                            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl w-full max-w-md shadow-sm">
                                <p className="text-slate-500 font-medium text-sm mb-4">Vas a aplicar un pago por:</p>
                                <div className="text-4xl font-black text-emerald-500 mb-6 drop-shadow-sm">
                                    {formatCurrency(numericAmount)}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">A distribuirse en</p>
                                        <p className="font-bold text-slate-800 text-sm">{paymentPreview.distribution.filter(d => d.pay > 0).length} Factura(s)</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cliente</p>
                                        <p className="font-bold text-slate-800 text-sm truncate" title={selectedInvoices[0]?.customer?.name || "Cliente"}>
                                            {selectedInvoices[0]?.customer?.name || "Varias facturas"}
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Método</p>
                                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                                            {method === "EFECTIVO" ? "💵" : method === "SALDO A FAVOR" ? "⭐" : method === "TRANSFERENCIA" ? "🏦" : "🧾"} {method}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Destino</p>
                                        <p className="font-bold text-slate-800 text-sm truncate" title={method === "SALDO A FAVOR" ? "Saldo de Cartera" : accounts.find(a => a.id === accountId)?.name || 'N/A'}>
                                            {method === "SALDO A FAVOR" ? "Saldo de Cartera" : accounts.find(a => a.id === accountId)?.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                {paymentPreview.remaining > 0 && method !== "SALDO A FAVOR" && (
                                    <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-xl text-left">
                                        <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                            ⚠️ Excedente detectado
                                        </p>
                                        <p className="text-xs text-amber-700/80 mt-1">
                                            Quedará un saldo a favor de <strong>{formatCurrency(paymentPreview.remaining)}</strong> para el cliente.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-white border-t border-slate-100 flex-shrink-0 grid grid-cols-2 gap-4">
                    {step === 'confirm' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep('form')}
                                disabled={loading}
                                className="w-full bg-white hover:bg-slate-50 text-slate-500 font-bold py-6 text-lg rounded-xl uppercase tracking-tight"
                            >
                                ← Atrás
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 text-lg rounded-xl shadow-xl shadow-emerald-200/50 uppercase tracking-tight"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "¡Sí, Abonar!"}
                            </Button>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <Button
                                onClick={handleConfirm}
                                disabled={loading || numericAmount <= 0 || (!accountId && method !== "SALDO A FAVOR")}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 text-lg rounded-xl shadow-xl shadow-emerald-200/50 uppercase tracking-tight"
                            >
                                Siguiente →
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
