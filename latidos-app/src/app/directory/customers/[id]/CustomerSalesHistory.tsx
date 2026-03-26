import { format } from "date-fns";
import { es } from "date-fns/locale"; // Assuming locale is needed, otherwise default
import { Receipt, Eye, Calendar, CreditCard, DollarSign } from "lucide-react";
import Link from "next/link";

interface Sale {
    id: string;
    date: string | Date;
    total: any;
    invoiceNumber: string | null;
    paymentMethod: string;
}

interface CustomerSalesHistoryProps {
    sales: Sale[];
}

export default function CustomerSalesHistory({ sales }: CustomerSalesHistoryProps) {
    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col h-full overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-subheading text-primary uppercase tracking-tight">Historial de Compras</h2>
                        <p className="text-sm font-medium text-secondary">Facturas y recibos asociados</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                        <div className="w-16 h-16 bg-header rounded-full flex items-center justify-center mb-4">
                            <Receipt className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-secondary font-medium">Este cliente no tiene compras registradas.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5/80 sticky top-0 z-10 backdrop-blur">
                            <tr>
                                <th className="px-6 py-4 font-black text-secondary uppercase text-xs tracking-wider">Fecha / Factura</th>
                                <th className="px-6 py-4 font-black text-secondary uppercase text-xs tracking-wider">Monto Total</th>
                                <th className="px-6 py-4 font-black text-secondary uppercase text-xs tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-hover/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-primary flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-secondary" />
                                                {format(new Date(sale.date), "dd MMM yyyy", { locale: es })}
                                            </span>
                                            <span className="text-xs font-mono font-medium text-secondary ml-5.5">
                                                #{sale.invoiceNumber || "PENDIENTE"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-primary text-base flex items-center gap-1">
                                                <DollarSign className="w-3.5 h-3.5 text-success" />
                                                {Number(sale.total).toLocaleString('es-CO')}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-header text-secondary rounded-lg w-fit mt-1">
                                                {sale.paymentMethod}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/sales/${sale.id}/invoice`}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-secondary font-bold text-xs hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            VER RECIBO
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
