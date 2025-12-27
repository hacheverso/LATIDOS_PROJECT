"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClientSelector } from "./ClientSelector";
import { InvoiceList } from "./InvoiceList";
import { PaymentSummary } from "./PaymentSummary";
import { getPendingInvoices, processCascadePayment, getCustomerById } from "./actions";
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
        const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));

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
            const res = await processCascadePayment(customer.id, numAmount, orderedSelected, paymentMethod);

            if (res.success) {
                setResult(res);
            } else {
                alert("Error al procesar el pago");
            }
        } catch (error) {
            console.error(error);
            alert("Error inesperado");
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
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={!customer.creditBalance}>
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


                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> MÉTODO DE PAGO
                            </label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="EFECTIVO">Efectivo (Caja)</option>
                                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                <option value="NOTA_CREDITO">Nota a Crédito</option>
                                <option value="RETOMA">Retoma (Mercancía)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 block">
                                MONTO TOTAL A ABONAR
                            </label>
                            <Input
                                type="number"
                                placeholder="$ 0.00"
                                className="text-2xl font-bold text-right h-14 border-blue-200 focus-visible:ring-blue-500"
                                value={amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                            disabled={!customer || selectedIds.length === 0 || processing}
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

                        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                            <strong>Nota:</strong> El sistema aplicará el pago a las facturas seleccionadas en orden de antigüedad (FIFO).
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
