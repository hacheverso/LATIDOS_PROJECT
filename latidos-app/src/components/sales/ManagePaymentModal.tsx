import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, Edit, Wallet } from "lucide-react";
import { deletePayment, updatePayment } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    payment: any;
    mode: 'EDIT' | 'DELETE';
    onSuccess: () => void;
};

export default function ManagePaymentModal({ isOpen, onClose, payment, mode, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);

    // UI State
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("EFECTIVO");
    const [accountId, setAccountId] = useState<string>("");
    const [accounts, setAccounts] = useState<{ id: string, name: string, type: string }[]>([]);

    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    // Initialize State on Open
    useEffect(() => {
        if (isOpen) {
            // Load Accounts
            getPaymentAccounts().then(accs => setAccounts(accs));

            if (payment) {
                setAmount(new Intl.NumberFormat("es-CO").format(payment.amount));
                setMethod(payment.method || "EFECTIVO");
                setAccountId(payment.accountId || "");
            }
        }
    }, [isOpen, payment]);

    const handleAction = async () => {
        if (!reason || reason.length < 5) {
            setError("Debe escribir una razón válida (mínimo 5 caracteres).");
            return;
        }

        const numericAmount = parseInt(amount.replace(/\D/g, "") || "0", 10);
        if (mode === 'EDIT' && numericAmount <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            if (mode === 'DELETE') {
                await deletePayment(payment.id, reason);
            } else {
                await updatePayment(payment.id, numericAmount, reason, method, accountId, payment.date);
            }
            onSuccess();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Shared Method Grid for cleaner code
    const MethodSelector = () => {
        // Determine Locking Logic based on Account
        const selectedAccount = accounts.find(a => a.id === accountId);
        let lockedMethod = null;
        let bankLocked = false;
        let cashLocked = false;
        let noteLocked = false;

        if (selectedAccount) {
            const nameLower = selectedAccount.name.toLowerCase();
            const isBank = selectedAccount.type === 'BANK' || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi");
            const isCash = selectedAccount.type === 'CASH' || nameLower.includes("caja") || nameLower.includes("efectivo");
            const isCreditNote = nameLower.includes("nota") && nameLower.includes("credito");

            if (isBank) bankLocked = true;
            if (isCash) cashLocked = true;
            if (isCreditNote) noteLocked = true;
        }

        return (
            <div className="grid grid-cols-2 gap-2 mt-2">
                {["EFECTIVO", "TRANSFERENCIA", "NOTA CRÉDITO", "RETOMA"].map((m) => {
                    let isDisabled = false;
                    if (bankLocked && m !== "TRANSFERENCIA") isDisabled = true;
                    if (cashLocked && m !== "EFECTIVO") isDisabled = true;
                    if (noteLocked && m !== "NOTA CRÉDITO") isDisabled = true;

                    return (
                        <button
                            key={m}
                            onClick={() => !isDisabled && setMethod(m)}
                            disabled={isDisabled}
                            className={`p-2 rounded-lg border text-xs font-bold uppercase transition-all ${isDisabled
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

    if (!payment) return null;

    // Impact Warning Calculation
    const originalAccountId = payment.accountId;
    const accountChanged = accountId && originalAccountId && accountId !== originalAccountId;
    const originalAccountName = accounts.find(a => a.id === originalAccountId)?.name || "Original";
    const newAccountName = accounts.find(a => a.id === accountId)?.name || "Nueva";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="bg-white p-6 pb-2 border-b border-slate-50">
                    <DialogTitle className="flex items-center gap-2">
                        {mode === 'DELETE' ? (
                            <>
                                <div className="bg-red-50 p-2 rounded-lg"><Trash2 className="text-red-600 w-5 h-5" /></div>
                                <span className="text-red-700 font-bold">Eliminar Abono</span>
                            </>
                        ) : (
                            <>
                                <div className="bg-blue-50 p-2 rounded-lg"><Edit className="text-blue-600 w-5 h-5" /></div>
                                <span className="text-slate-900 font-black tracking-tight uppercase">Editar Abono</span>
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 p-6">
                    {mode === 'DELETE' && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-900 text-sm flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                            <div>
                                <span className="font-black block mb-1">¡Acción Irreversible!</span>
                                Esta acción aumentará la deuda de la factura en <span className="font-bold">${payment.amount.toLocaleString()}</span> y eliminará el registro financiero.
                            </div>
                        </div>
                    )}

                    {mode === 'EDIT' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nuevo Monto</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-4 py-3 text-xl font-black text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                                        value={amount}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/\D/g, "");
                                            if (!raw) setAmount("");
                                            else setAmount(new Intl.NumberFormat("es-CO").format(parseInt(raw, 10)));
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Account Selector */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Wallet className="w-3 h-3" /> Cuenta de Destino
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                    value={accountId}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        setAccountId(newId);
                                        // Auto-Select Method Logic Duplicate for immediate feedback
                                        const account = accounts.find(a => a.id === newId);
                                        if (account) {
                                            const nameLower = account.name.toLowerCase();
                                            if (nameLower.includes("nota") && nameLower.includes("credito")) setMethod("NOTA CRÉDITO");
                                            else if (account.type === "BANK" || nameLower.includes("bancolombia") || nameLower.includes("davi") || nameLower.includes("nequi")) setMethod("TRANSFERENCIA");
                                            else if (account.type === "CASH" || nameLower.includes("caja") || nameLower.includes("efectivo")) setMethod("EFECTIVO");
                                        }
                                    }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {accounts.map(acc => {
                                        let icon = "🏦";
                                        if (acc.type === 'CASH') icon = "💵";
                                        else if (acc.name.toLowerCase().includes("nequi")) icon = "📱";
                                        return <option key={acc.id} value={acc.id}>{icon} {acc.name}</option>
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Método de Pago</label>
                                <MethodSelector />
                                <p className="text-[10px] text-slate-400 mt-2 text-center italic">
                                    Métodos bloqueados automáticamente según la cuenta elegida.
                                </p>
                            </div>

                            {/* Impact Warning */}
                            {accountChanged && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-xs text-orange-800 flex items-start gap-2">
                                    <Wallet className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>
                                        <b>Cambio de Cuenta Detectado:</b> Se restarán <span className="font-bold">${payment.amount.toLocaleString()}</span> de <u>{originalAccountName}</u> y se sumará el nuevo monto a <u>{newAccountName}</u>.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Razón del Cambio <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full text-sm font-bold border border-slate-300 rounded-xl p-3 mt-1 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                            placeholder={mode === 'DELETE' ? "Ej: Error de digitación, abono duplicado..." : "Ej: Ajuste de valor real..."}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAction}
                        disabled={loading}
                        className={`font-bold shadow-lg px-6 ${mode === 'DELETE' ? "bg-red-600 hover:bg-red-700 shadow-red-200 text-white" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 text-white"}`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'DELETE' ? "Confirmar Eliminación" : "Guardar Cambios")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
