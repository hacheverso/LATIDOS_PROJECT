"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, CreditCard, ShoppingBag, Plus, AlertCircle, Trash2, Printer, PrinterIcon, Edit, Wallet, ChevronDown, ChevronUp, Copy, Check, Eye } from "lucide-react";
import { getSaleDetails, checkUserRole } from "../payment-actions";
import AddPaymentModal from "@/components/sales/AddPaymentModal";
import ManagePaymentModal from "@/components/sales/ManagePaymentModal";
import EditSaleModal from "../components/EditSaleModal";
import AuditTimeline from "../components/AuditTimeline";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
export default function SaleDetailPage() {
    const { id } = useParams();
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit State 

    // Manage Payment State
    const [managePaymentOpen, setManagePaymentOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [manageMode, setManageMode] = useState<'EDIT' | 'DELETE'>('EDIT');
    const [userRole, setUserRole] = useState("GESTION_OPERATIVA");

    useEffect(() => {
        checkUserRole().then(setUserRole);
    }, []);

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

    const balance = sale.total - sale.amountPaid;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-transparent p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/sales" className="p-2 bg-white dark:bg-white/5 rounded-full shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tight">
                                VENTA #{sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase()}
                            </h1>
                            <Badge className={cn(
                                "uppercase font-bold tracking-widest",
                                balance <= 0 ? "bg-green-100 text-green-700 border-green-200" :
                                    sale.amountPaid > 0 ? "bg-amber-100 text-amber-700 border-amber-200" :
                                        "bg-red-100 text-red-700 border-red-200"
                            )}>
                                {balance <= 0 ? 'PAGADO' : sale.amountPaid > 0 ? 'ABONADO' : 'PENDIENTE'}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-medium">
                            {new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-2 bg-surface border border-border rounded-xl font-bold text-muted hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500/30"
                    >
                        <Edit className="w-4 h-4" />
                        EDITAR FACTURA
                    </button>
                    <Link
                        href={`/sales/${sale.id}/invoice`}
                        target="_blank"
                        className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-wide hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg hover:shadow-slate-500/30 flex items-center gap-2 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Link>
                    {balance > 0 && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wide hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 transition-all"
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
                    <div className="bg-surface rounded-2xl p-6 shadow-sm dark:shadow-none border border-border">
                        <h2 className="text-sm font-black text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Cliente
                        </h2>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xl font-bold text-foreground">{sale.customer.name}</div>
                                <div className="text-muted font-mono text-sm">{sale.customer.taxId}</div>
                                <div className="text-muted text-sm mt-1">{sale.customer.phone || "Sin teléfono"}</div>
                                <div className="text-muted text-sm">{sale.customer.email || "Sin email"}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-muted uppercase tracking-wider">Dirección</div>
                                <div className="text-sm text-muted font-medium max-w-[200px]">{sale.customer.address || "No registrada"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-surface rounded-2xl shadow-sm dark:shadow-none border border-border overflow-hidden">
                        <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-white/5">
                            <h2 className="text-sm font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Items Facturados
                            </h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-transparent text-muted font-bold uppercase text-xs border-b dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left">Producto</th>
                                    <th className="px-6 py-4 text-center">Cant.</th>
                                    <th className="px-6 py-4 text-right">Precio Unit.</th>
                                    <th className="px-6 py-4 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {Object.values(sale.instances.reduce((acc: any, item: any) => {
                                    const key = item.productId;
                                    if (!acc[key]) {
                                        acc[key] = {
                                            id: item.productId,
                                            product: item.product,
                                            unitPrice: Number(item.soldPrice) || Number(item.product.basePrice) || 0,
                                            instances: []
                                        };
                                    }
                                    acc[key].instances.push(item);
                                    return acc;
                                }, {})).map((group: any) => (
                                    <GroupedItemRow key={group.id} group={group} />
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50/50 dark:bg-white/5 border-t dark:border-white/10">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right font-black text-muted uppercase tracking-widest text-xs">Total Factura</td>
                                    <td className="px-6 py-4 text-right font-black text-foreground text-lg">
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
                        "rounded-2xl p-6 shadow-sm dark:shadow-none border flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors",
                        balance > 0 ? "bg-background border-orange-100 dark:border-orange-500/20" : "bg-green-50 dark:bg-emerald-500/10 border-green-100 dark:border-emerald-500/20"
                    )}>
                        <div className="relative z-10">
                            <div className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Saldo Pendiente</div>
                            <div className={cn(
                                "text-4xl font-black mb-1",
                                balance > 0 ? "text-orange-600 dark:text-orange-500" : "text-green-600 dark:text-emerald-400"
                            )}>
                                ${balance.toLocaleString()}
                            </div>
                            {balance > 0 && (
                                <div className="text-xs font-medium text-orange-600/70 dark:text-orange-400/80 bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-full inline-block">
                                    Vence: {new Date(new Date(sale.date).setDate(new Date(sale.date).getDate() + 30)).toLocaleDateString()}
                                </div>
                            )}
                            {balance <= 0 && (
                                <div className="flex items-center justify-center gap-1 text-green-700 dark:text-emerald-400 font-bold text-sm mt-2">
                                    <AlertCircle className="w-4 h-4" /> Pagado Totalmente
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="bg-surface rounded-2xl shadow-sm dark:shadow-none border border-border overflow-hidden">
                        <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                            <h2 className="text-sm font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Historial de Pagos
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[400px] overflow-y-auto">
                            {sale.payments.length === 0 && (
                                <div className="p-8 text-center text-muted text-sm italic">
                                    No hay pagos registrados.
                                </div>
                            )}
                            {sale.payments.map((payment: any, idx: number) => (
                                <div key={payment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex justify-between items-center group">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            Abono #{sale.payments.length - idx}
                                            {payment.reference && (
                                                <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-muted px-1.5 py-0.5 rounded font-mono">
                                                    REF: {payment.reference || (sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase())}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted font-medium mt-0.5">
                                            {new Date(payment.date).toLocaleDateString()} • {new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {payment.method}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-green-600 dark:text-emerald-400">
                                            +${payment.amount.toLocaleString()}
                                        </div>
                                        {userRole === 'ADMIN' && (
                                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setManageMode('EDIT');
                                                        setManagePaymentOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Editar Abono"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setManageMode('DELETE');
                                                        setManagePaymentOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar Abono"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-border flex justify-between items-center text-sm">
                            <span className="font-bold text-muted">Total Pagado</span>
                            <span className="font-black text-slate-800 dark:text-white">${sale.amountPaid.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Timeline */}
            <AuditTimeline audits={sale.audits} />

            {/* Modals */}
            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                saleId={sale.id}
                balance={balance}
                customerCredit={sale.customer.creditBalance}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    fetchSale();
                }}
            />

            {isEditModalOpen && (
                <EditSaleModal
                    sale={sale}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        fetchSale(); // Refresh data after edit
                    }}
                />
            )}

            <ManagePaymentModal
                isOpen={managePaymentOpen}
                onClose={() => setManagePaymentOpen(false)}
                payment={selectedPayment}
                mode={manageMode}
                onSuccess={() => {
                    fetchSale();
                    setManagePaymentOpen(false);
                }}
            />
        </div>
    );
}

function GroupedItemRow({ group }: { group: any }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const quantity = group.instances.length;
    const subtotal = quantity * group.unitPrice;
    const hasSerials = group.instances.some((i: any) => i.serialNumber && i.serialNumber !== "N/A");

    const copySerials = () => {
        const serials = group.instances
            .map((i: any) => i.serialNumber)
            .filter((s: string) => s && s !== "N/A")
            .join("\n");
        navigator.clipboard.writeText(serials);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <tr className={cn("hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors", isExpanded && "bg-slate-50 dark:bg-white/5")}>
                <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                        {hasSerials && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="mt-1 p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-muted hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}
                        <div>
                            <div className="font-bold text-foreground flex items-center gap-2">
                                {group.product.name}
                                <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-muted px-1.5 py-0.5 rounded-full font-black border border-border">
                                    x{quantity}
                                </span>
                            </div>
                            <div className="text-xs text-muted font-mono mt-0.5">{group.product.sku}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-muted">
                    {quantity}
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                    ${group.unitPrice.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">
                    ${subtotal.toLocaleString()}
                </td>
            </tr>
            {isExpanded && hasSerials && (
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] animate-in fade-in slide-in-from-top-2">
                    <td colSpan={4} className="px-6 py-4 p-0">
                        <div className="ml-12 border-l-2 border-border pl-6 py-2">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                                    Seriales / IMEIs ({group.instances.filter((i: any) => i.serialNumber && i.serialNumber !== "N/A").length})
                                </span>
                                <button
                                    onClick={copySerials}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-1 rounded transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied ? "Copiado" : "Copiar Lista"}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 pr-4">
                                {group.instances.map((item: any) => (
                                    item.serialNumber && item.serialNumber !== "N/A" && (
                                        <div key={item.id} className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-black/20 border border-border px-3 py-1.5 rounded flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                            {item.serialNumber}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
