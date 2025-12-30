"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClientSelector } from "./ClientSelector";
import { InvoiceList } from "./InvoiceList";
import { PaymentSummary } from "./PaymentSummary";
import { getPendingInvoices, processCascadePayment, getCustomerById, redeemCreditBalance } from "./actions";
import { getPaymentAccounts } from "../../finance/actions";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Send, RotateCcw, Printer, Wallet, CreditCard } from "lucide-react";

// Types ... (Same as before)
interface Customer {
    id: string;
    name: string;
    taxId: string;
    creditBalance?: number;
}

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    date: Date;
    total: number;
    amountPaid: number;
    pendingBalance: number;
}

function MassCollectionContent() {
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [amount, setAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO");

    // States for flow
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [paymentSummary, setPaymentSummary] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");

    // Fetch accounts
    useEffect(() => {
        getPaymentAccounts().then(setAccounts).catch(console.error);
    }, []);

    // Deep Link Logic
    useEffect(() => {
        if (customerIdParam && !customer) {
            getCustomerById(customerIdParam).then((c) => {
                if (c) {
                    setCustomer({
                        id: c.id,
                        name: c.name,
                        taxId: c.taxId,
                        // @ts-ignore
                        creditBalance: Number(c.creditBalance)
                    });
                }
            });
        }
    }, [customerIdParam]);

    // Fetch invoices when customer selected
    useEffect(() => {
        if (customer) {
            setLoadingInvoices(true);
            getPendingInvoices(customer.id)
                .then((data) => {
                    // @ts-ignore
                    setInvoices(data);
                    // @ts-ignore
                    setSelectedIds(data.map(inv => inv.id));
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingInvoices(false));
        } else {
            setInvoices([]);
            setSelectedIds([]);
            setResult(null);
            setAmount("");
        }
    }, [customer]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(invoices.map(inv => inv.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleProcessPayment = async () => {
        if (!customer) return;
        const numAmount = parseFloat(amount.replace(/\D/g, ''));

        if (isNaN(numAmount) || numAmount <= 0) {
            alert("Ingrese un monto válido");
            return;
        }

        if (selectedIds.length === 0) {
            alert("Seleccione al menos una factura");
            return;
        }

        setProcessing(true);
        try {
            const orderedSelected = invoices
                .filter(inv => selectedIds.includes(inv.id))
                .map(inv => inv.id);

            // Updated Action Call
            const res = await processCascadePayment(customer.id, numAmount, orderedSelected, paymentMethod, selectedAccountId);

            if (res.success) {
                setResult(res);
            } else {
                alert("Error al procesar el pago: " + (res.error || "Desconocido"));
            }
        } catch (error) {
            console.error(error);
            alert("Error inesperado");
        } finally {
            setProcessing(false);
        }
    };

    const handleBalanceRedemption = async () => {
        if (!customer || !customer.creditBalance) return;

        // Confirm
        const confirmMsg = `¿Deseas usar hasta ${formatCurrency(customer.creditBalance)} de saldo a favor para cubrir las facturas seleccionadas?`;
        if (!window.confirm(confirmMsg)) return;

        setProcessing(true);
        try {
            const invoiceFilter = selectedIds.length > 0 ? selectedIds : null;
            const res = await redeemCreditBalance(customer.id, invoiceFilter);

            if (res.success) {
                const successRes = res as any;
                setResult({
                    appliedPayments: successRes.appliedPayments,
                    remainingCredit: (customer.creditBalance - successRes.totalRedeemed) // Est. client side
                });
                // Hack to trigger summary with "Saldo a Favor" context
                setAmount(successRes.totalRedeemed.toString());
            } else {
                const errorRes = res as any;
                alert("Error: " + errorRes.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReset = () => {
        setCustomer(null);
        setPaymentMethod("EFECTIVO");
    };

    const totalDebt = invoices.reduce((acc, curr) => acc + curr.pendingBalance, 0);
    const selectedDebt = invoices
        .filter(inv => selectedIds.includes(inv.id))
        .reduce((acc, curr) => acc + curr.pendingBalance, 0);

    if (result) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <Card className="border-emerald-100 bg-emerald-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-800">
                            <CheckIcon className="w-6 h-6 text-emerald-600" />
                            ¡Recaudo Exitoso!
                        </CardTitle>
                        <CardDescription>
                            Se ha procesado el pago correctamente para {customer?.name}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PaymentSummary
                            appliedPayments={result.appliedPayments}
                            totalAmount={parseFloat(amount.replace(/[^0-9.]/g, ''))}
                            remainingCredit={result.remainingCredit}
                        />

                        <div className="flex gap-4 mt-8">
                            <Button className="flex-1 bg-slate-900" onClick={() => window.print()}>
                                <Printer className="w-4 h-4 mr-2" /> Imprimir Comprobante
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={handleReset}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Nueva Operación
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Inputs */}
            {/* Left Column: Inputs */}
            <div className="md:col-span-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Identificación del Cliente</CardTitle>
                        <CardDescription>Busque el cliente para cargar sus deudas pendientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customer ? (
                            <div className="p-4 bg-slate-50 border rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Cliente Seleccionado</p>
                                    <p className="text-lg font-black text-slate-900">{customer.name}</p>
                                    <p className="text-xs text-slate-400">NIT/CC: {customer.taxId}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Cambiar Cliente
                                </Button>
                            </div>
                        ) : (
                            <ClientSelector onSelect={setCustomer} />
                        )}

                        {customer && (
                            <div className="mt-4 p-4 bg-blue-50/50 rounded-lg flex items-center justify-between border border-blue-100">
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Saldo a Favor Disponible</p>
                                    <p className="text-xl font-bold text-blue-900">
                                        {formatCurrency(customer.creditBalance || 0)}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    disabled={!customer.creditBalance || processing}
                                    onClick={handleBalanceRedemption}
                                >
                                    Usar Saldo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {customer && (
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 mb-4 rounded-r-md">
                                <p className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                                    <CheckIcon className="w-5 h-5" />
                                    Mostrando {invoices.length} facturas pendientes de <strong>{customer.name}</strong>
                                </p>
                            </div>
                            <CardTitle>Facturas Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingInvoices ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <InvoiceList
                                    invoices={invoices}
                                    selectedIds={selectedIds}
                                    onToggleSelect={handleToggleSelect}
                                    onToggleAll={handleToggleAll}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Column: Payment Panel */}
            <div className="md:col-span-4 space-y-6">
                <Card className="sticky top-8 border-l-4 border-blue-500 shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-blue-500" /> Panel de Pago
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Deuda Total Seleccionada</label>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                                {formatCurrency(selectedDebt)}
                            </div>
                            <p className="text-xs text-slate-400">Total global: {formatCurrency(totalDebt)}</p>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            {/* 1. Account Selector (Primary) */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 block">
                                    CUENTA DE DEPÓSITO
                                </label>
                                <select
                                    autoFocus
                                    className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={selectedAccountId}
                                    onChange={(e) => {
                                        const newAccountId = e.target.value;
                                        setSelectedAccountId(newAccountId);

                                        // Auto-switch Logic
                                        const account = accounts.find(a => a.id === newAccountId);
                                        if (account) {
                                            if (account.type === 'BANK') setPaymentMethod('TRANSFERENCIA');
                                            else if (account.type === 'CASH') setPaymentMethod('EFECTIVO');
                                            else if (account.type === 'RETOMA') setPaymentMethod('RETOMA');
                                            else if (account.type === 'NOTA_CREDITO') setPaymentMethod('NOTA_CREDITO');
                                        }
                                    }}
                                >
                                    <option value="">Seleccione una cuenta...</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} - {formatCurrency(Number(acc.balance))}
                                        </option>
                                    ))}
                                </select>
                                {paymentMethod === "EFECTIVO" && selectedAccountId && accounts.find(a => a.id === selectedAccountId)?.type !== "CASH" && (
                                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                        ⚠️ Atención: Está registrando efectivo en una cuenta que no es de caja.
                                    </p>
                                )}
                            </div>

                            {/* 2. Payment Method (Read Only / Informative) */}
                            <div className="space-y-2 opacity-75">
                                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase">
                                    <CreditCard className="w-3 h-3" /> Método de Pago (Automático)
                                </label>
                                <select
                                    tabIndex={-1} // Skip tab navigation
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-sm pointer-events-none appearance-none"
                                    value={paymentMethod}
                                    disabled
                                // onChange removed to enforce read-only
                                >
                                    <option value="EFECTIVO">Efectivo (Caja)</option>
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="NOTA_CREDITO">Nota a Crédito</option>
                                    <option value="RETOMA">Retoma (Mercancía)</option>
                                </select>
                            </div>

                            {/* 3. Amount Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 block">
                                    MONTO TOTAL A ABONAR
                                </label>
                                <Input
                                    type="text"
                                    placeholder="$ 0"
                                    className="text-2xl font-bold text-right h-14 border-blue-200 focus-visible:ring-blue-500 bg-white"
                                    value={amount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const rawValue = e.target.value.replace(/\D/g, "");
                                        if (rawValue === "") {
                                            setAmount("");
                                            return;
                                        }
                                        const numberValue = parseInt(rawValue, 10);
                                        setAmount(new Intl.NumberFormat("es-CO").format(numberValue));
                                    }}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                            disabled={!customer || selectedIds.length === 0 || processing || !selectedAccountId}
                            onClick={handleProcessPayment}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" /> Confirmar Pago
                                </>
                            )}
                        </Button>

                        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed text-center">
                            Pago aplicado vía <strong>FIFO</strong>.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function MassCollection() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando motor de pagos...</div>}>
            <MassCollectionContent />
        </Suspense>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    )
}
