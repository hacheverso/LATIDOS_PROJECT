"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Sale {
    id: string;
    date: string; // ISO String
    total: number;
    amountPaid: number;
    invoiceNumber: string | null;
    paymentMethod: string;
}

interface Payment {
    id: string;
    date: string; // ISO String
    amount: number;
    method: string;
    reference: string | null;
    saleId: string;
    sale?: {
        invoiceNumber: string | null;
        total: number;
    };
    notes?: string | null;
}

interface CustomerFinancialTabsProps {
    sales: Sale[];
    payments: Payment[];
}

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export default function CustomerFinancialTabs({ sales, payments }: CustomerFinancialTabsProps) {
    // Calculations
    const totalPurchased = sales.reduce((acc, s) => acc + s.total, 0);
    const totalPaid = sales.reduce((acc, s) => acc + s.amountPaid, 0); // Using sale.amountPaid for accuracy on what has been covered
    const pendingBalance = totalPurchased - totalPaid;

    // Sort by date desc
    const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            {/* Financial Summary Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-surface border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            Total Comprado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{formatMoney(totalPurchased)}</div>
                        <p className="text-xs text-muted mt-1">{sales.length} facturas registradas</p>
                    </CardContent>
                </Card>

                <Card className="bg-surface border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Total Pagado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatMoney(totalPaid)}</div>
                        <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1">Abonos verificados</p>
                    </CardContent>
                </Card>

                <Card className={`border-border shadow-sm ${pendingBalance > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-surface'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${pendingBalance > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-muted'}`} />
                            Saldo Pendiente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-black ${pendingBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted'}`}>
                            {formatMoney(pendingBalance)}
                        </div>
                        {pendingBalance > 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-1 animate-pulse">¡Pago Requerido!</p>
                        ) : (
                            <p className="text-xs text-muted mt-1">Cuenta al día</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* History Tabs */}
            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="sales">Facturas y Ventas</TabsTrigger>
                    <TabsTrigger value="payments">Historial de Pagos</TabsTrigger>
                </TabsList>

                {/* SALES CONTENT */}
                <TabsContent value="sales" className="mt-4">
                    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-background">
                                <TableRow>
                                    <TableHead className="w-[120px] font-bold text-muted uppercase text-xs">Fecha</TableHead>
                                    <TableHead className="font-bold text-muted uppercase text-xs">Factura</TableHead>
                                    <TableHead className="text-right font-bold text-muted uppercase text-xs">Total</TableHead>
                                    <TableHead className="text-right font-bold text-muted uppercase text-xs">Pagado</TableHead>
                                    <TableHead className="text-right font-bold text-muted uppercase text-xs">Saldo</TableHead>
                                    <TableHead className="text-center font-bold text-muted uppercase text-xs">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted">
                                            No hay historial de ventas.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedSales.map((sale) => {
                                        const balance = sale.total - sale.amountPaid;
                                        const isPaid = balance <= 0;

                                        return (
                                            <TableRow key={sale.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-border">
                                                <TableCell className="font-medium text-muted text-xs">
                                                    {format(new Date(sale.date), "dd/MM/yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-white">
                                                    {sale.invoiceNumber ? (
                                                        <Link href={`/sales/${sale.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors block w-fit">
                                                            {sale.invoiceNumber}
                                                        </Link>
                                                    ) : "N/A"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                                                    {formatMoney(sale.total)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                    {formatMoney(sale.amountPaid)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                                                    {formatMoney(balance)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isPaid ? (
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-[10px] uppercase">Pagado</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-[10px] uppercase">Pendiente</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-background">
                                <TableRow>
                                    <TableHead className="w-[120px] font-bold text-muted uppercase text-xs">Fecha</TableHead>
                                    <TableHead className="font-bold text-muted uppercase text-xs">Método</TableHead>
                                    <TableHead className="font-bold text-muted uppercase text-xs">Referencia</TableHead>
                                    <TableHead className="font-bold text-muted uppercase text-xs">Factura Asoc.</TableHead>
                                    <TableHead className="text-right font-bold text-muted uppercase text-xs">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted">
                                            No hay historial de pagos.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedPayments.map((payment) => (
                                        <TableRow key={payment.id} className="hover:bg-slate-50 dark:hover:bg-white/5 border-border transition-colors">
                                            <TableCell className="font-medium text-slate-600 dark:text-slate-400 text-xs">
                                                {format(new Date(payment.date), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </TableCell>
                                            <TableCell className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300">
                                                {payment.method}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 dark:text-slate-500 font-mono">
                                                {payment.reference || "-"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {payment.sale?.invoiceNumber ? (
                                                    <Link href={`/sales/${payment.saleId}`} className="block w-fit">
                                                        <span className="font-mono bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-muted hover:bg-slate-200 dark:hover:bg-white/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer decoration-blue-400">
                                                            {payment.sale.invoiceNumber}
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted italic">Sin factura</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                                {formatMoney(payment.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
