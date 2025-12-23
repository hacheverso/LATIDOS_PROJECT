"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSaleDetails } from "../payment-actions"; // adjust path
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Printer, CreditCard, Calendar, User, DollarSign, Wallet, AlertCircle } from "lucide-react";
import Link from 'next/link';
import AddPaymentModal from "@/components/sales/AddPaymentModal"; // We will create this
import { cn } from "@/lib/utils";

export default function SaleDetailPage() {
    const { id } = useParams();
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fetchSale = async () => {
        try {
            const data = await getSaleDetails(id as string);
            setSale(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSale();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando detalles de venta...</div>;
    if (!sale) return <div className="p-8 text-center text-red-500">Venta no encontrada</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/sales" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-blue-600">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                VENTA #{sale.id.slice(0, 8).toUpperCase()}
                            </h1>
                            <Badge className={cn(
                                "uppercase font-bold tracking-widest",
                                sale.status === 'PAID' ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" :
                                    sale.status === 'PARTIAL' ? "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200" :
                                        "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
                            )}>
                                {sale.status === 'PAID' ? 'PAGADO' : sale.status === 'PARTIAL' ? 'ABONADO' : 'PENDIENTE'}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-medium">
                            {new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link
                        href={`/sales/${sale.id}/invoice`}
                        target="_blank"
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Link>
                    {sale.status !== 'PAID' && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-wide hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 transition-all"
                        >
                            <CreditCard className="w-4 h-4" />
                            Registrar Abono
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Invoice Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Customer Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Cliente
                        </h2>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xl font-bold text-slate-900">{sale.customer.name}</div>
                                <div className="text-slate-500 font-mono text-sm">{sale.customer.taxId}</div>
                                <div className="text-slate-500 text-sm mt-1">{sale.customer.phone || "Sin teléfono"}</div>
                                <div className="text-slate-500 text-sm">{sale.customer.email || "Sin email"}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección</div>
                                <div className="text-sm text-slate-600 font-medium max-w-[200px]">{sale.customer.address || "No registrada"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Items Facturados
                            </h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 text-left">Producto</th>
                                    <th className="px-6 py-4 text-center">Serial</th>
                                    <th className="px-6 py-4 text-right">Precio Unit.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sale.instances.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.product.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{item.product.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.serialNumber && item.serialNumber !== "N/A" ? (
                                                <Badge variant="outline" className="font-mono text-xs border-slate-200 text-slate-600">
                                                    {item.serialNumber}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Genérico</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                                            ${item.product.basePrice.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50/50">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-xs">Total</td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 text-lg">
                                        ${sale.total.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Right Column: Payment History & Balance */}
                <div className="space-y-6">
                    {/* Balance Card */}
                    <div className={cn(
                        "rounded-2xl p-6 shadow-sm border flex flex-col items-center justify-center text-center relative overflow-hidden",
                        sale.balance > 0 ? "bg-white border-orange-100" : "bg-green-50 border-green-100"
                    )}>
                        <div className="relative z-10">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Saldo Pendiente</div>
                            <div className={cn(
                                "text-4xl font-black mb-1",
                                sale.balance > 0 ? "text-orange-600" : "text-green-600"
                            )}>
                                ${sale.balance.toLocaleString()}
                            </div>
                            {sale.balance > 0 && (
                                <div className="text-xs font-medium text-orange-600/70 bg-orange-50 px-3 py-1 rounded-full inline-block">
                                    Vence: {new Date(new Date(sale.date).setDate(new Date(sale.date).getDate() + 30)).toLocaleDateString()}
                                </div>
                            )}
                            {sale.balance <= 0 && (
                                <div className="flex items-center justify-center gap-1 text-green-700 font-bold text-sm mt-2">
                                    <AlertCircle className="w-4 h-4" /> Pagado Totalmente
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Historial de Pagos
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {sale.payments.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                    No hay pagos registrados.
                                </div>
                            )}
                            {sale.payments.map((payment: any, idx: number) => (
                                <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-700 flex items-center gap-2">
                                            Abono #{sale.payments.length - idx}
                                            {payment.reference && (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                                    REF: {payment.reference}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                                            {new Date(payment.date).toLocaleDateString()} • {payment.method}
                                        </div>
                                    </div>
                                    <div className="font-bold text-green-600">
                                        +${payment.amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Total Pagado</span>
                            <span className="font-black text-slate-800">${sale.amountPaid.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                saleId={sale.id}
                balance={sale.balance}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    fetchSale();
                }}
            />
        </div>
    );
}
