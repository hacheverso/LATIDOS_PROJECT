import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Layers, ArrowRight, CheckCircle2, Check } from "lucide-react";
import { processCascadingPayment, getCustomerCredit } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";
import { cn } from "@/lib/utils";

interface CascadingPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoices: any[]; // Expects array of invoice objects
    onSuccess: () => void;
}

export default function CascadingPaymentModal({ isOpen, onClose, selectedInvoices, onSuccess }: CascadingPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<{ id: string, name: string, type: string }[]>([]);
    const [customerCredit, setCustomerCredit] = useState(0);

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
        }
    }, [isOpen, selectedInvoices]);

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
        // Re-calc remaining from original numericAmount for Cash surplus display
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
    const totalPay = paymentPreview.distribution.reduce((acc, d) => acc + d.pay, 0);

    const handleConfirm = async () => {
        if (!numericAmount || numericAmount <= 0) return alert("Ingrese un monto válido");
        if (!accountId && method !== "SALDO A FAVOR") return alert("Seleccione una cuenta de destino");

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
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Shared Method Selector (Similar to ManagePaymentModal)
    const MethodSelector = () => {
        if (method === "SALDO A FAVOR") return null;

        const selectedAccount = accounts.find(a => a.id === accountId);
        let bankLocked = false;
        let cashLocked = false;

        if (selectedAccount) {
            const nameLower = selectedAccount.name.toLowerCase();
            const isBank = selectedAccount.type === 'BANK' || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi");
            const isCash = selectedAccount.type === 'CASH' || nameLower.includes("caja") || nameLower.includes("efectivo");
            if (isBank) bankLocked = true;
            if (isCash) cashLocked = true;
        }

        return (
            <div className="grid grid-cols-4 gap-2 mt-2">
                {["EFECTIVO", "TRANSFERENCIA", "NOTA CRÉDITO", "RETOMA"].map((m) => {
                    let isDisabled = false;
                    if (bankLocked && m !== "TRANSFERENCIA") isDisabled = true;
                    if (cashLocked && m !== "EFECTIVO") isDisabled = true;
                    return (
                        <button
                            key={m}
                            onClick={() => !isDisabled && setMethod(m)}
                            disabled={isDisabled}
                            className={`p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${isDisabled
                                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                : method === m
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {m}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-lg font-black uppercase tracking-tight">Abono Inteligente</span>
                            <span className="block text-xs font-medium text-slate-500">Distribución en cascada por antigüedad</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* CUSTOMER CREDIT ALERT */}
                    {customerCredit > 0 && method !== "SALDO A FAVOR" && (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in zoom-in-95">
                            <div>
                                <h4 className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wide">
                                    <Wallet className="w-4 h-4" /> Saldo Disponible
                                </h4>
                                <p className="text-emerald-600/80 text-xs font-medium mt-1">
                                    El cliente tiene <strong>${customerCredit.toLocaleString()}</strong> a favor.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setMethod("SALDO A FAVOR");
                                    setAccountId("");
                                    // Auto-fill amount (Max pending or Max credit)
                                    const prepay = Math.min(totalDebt, customerCredit);
                                    setAmount(prepay.toLocaleString('es-CO'));
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-200 font-bold"
                            >
                                USAR
                            </Button>
                        </div>
                    )}

                    {/* Top Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Deuda Seleccionada</label>
                            <div className="text-2xl font-black text-slate-900">${totalDebt.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 font-bold">{selectedInvoices.length} facturas</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-1">Monto a Abonar</label>
                            <div className="relative">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-lg">$</span>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full pl-6 bg-transparent text-2xl font-black text-blue-700 placeholder:text-blue-300 focus:outline-none"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        setAmount(val ? parseInt(val).toLocaleString('es-CO') : "");
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Info Or Credit Display */}
                    {method === "SALDO A FAVOR" ? (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wide">
                                    <Wallet className="w-4 h-4" /> Método: Saldo a Favor
                                </h4>
                                <p className="text-emerald-600/80 text-xs font-medium mt-1">
                                    Se descontará del crédito disponible del cliente.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setMethod("EFECTIVO"); // Reset
                                }}
                                className="bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold"
                            >
                                Cambiar Método
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Wallet className="w-3 h-3" /> Cuenta de Destino
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                    value={accountId}
                                    onChange={(e) => {
                                        setAccountId(e.target.value);
                                        // Same auto-select logic
                                        const account = accounts.find(a => a.id === e.target.value);
                                        if (account) {
                                            const nameLower = account.name.toLowerCase();
                                            if (account.type === 'BANK' || nameLower.includes("bancolombia")) setMethod("TRANSFERENCIA");
                                            else if (account.type === 'CASH') setMethod("EFECTIVO");
                                        }
                                    }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Referencia / Notas</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Opcional..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {method !== "SALDO A FAVOR" && (
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Método de Pago</label>
                            <MethodSelector />
                        </div>
                    )}

                    {/* Distribution Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Previsualización de Aplicación</span>
                            {paymentPreview.remaining > 0 && method !== "SALDO A FAVOR" && (
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Excedente: ${paymentPreview.remaining.toLocaleString()}
                                </span>
                            )}
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-white text-slate-400 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-2 text-left">Factura</th>
                                    <th className="px-4 py-2 text-right">Saldo Actual</th>
                                    <th className="px-4 py-2 text-right text-blue-600">Abono</th>
                                    <th className="px-4 py-2 text-right">Nuevo Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paymentPreview.distribution.map((item) => (
                                    <tr key={item.id} className={item.pay > 0 ? "bg-blue-50/30" : ""}>
                                        <td className="px-4 py-2 font-medium text-slate-700">
                                            {item.ref} <span className="text-slate-400 text-[10px] ml-1">{new Date(item.date).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right text-slate-500">${item.pending.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right font-bold text-blue-600">
                                            {item.pay > 0 ? `+ $${item.pay.toLocaleString()}` : "-"}
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold">
                                            {item.newPending === 0 ? (
                                                <span className="text-green-600 flex items-center justify-end gap-1"><CheckCircle2 className="w-3 h-3" /> Pagado</span>
                                            ) : (
                                                <span className="text-orange-600">${item.newPending.toLocaleString()}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* SURPLUS CHECKBOX */}
                        {paymentPreview.remaining > 0 && method !== "SALDO A FAVOR" && (
                            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center gap-3">
                                <div className="flex items-center h-5">
                                    <input
                                        id="saveCred"
                                        type="checkbox"
                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                        checked={saveExcessAsCredit}
                                        onChange={(e) => setSaveExcessAsCredit(e.target.checked)}
                                    />
                                </div>
                                <div className="text-sm">
                                    <label htmlFor="saveCred" className="font-bold text-slate-700 block cursor-pointer">
                                        Guardar excedente como Saldo a Favor
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        {saveExcessAsCredit
                                            ? `Se guardarán $${paymentPreview.remaining.toLocaleString()} en la billetera del cliente.`
                                            : `Se devolverán $${paymentPreview.remaining.toLocaleString()} en efectivo como cambio.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                    <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">Cancelar</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || numericAmount <= 0 || (!accountId && method !== "SALDO A FAVOR")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 px-8"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Abono"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
