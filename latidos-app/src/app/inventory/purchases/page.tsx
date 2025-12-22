import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { DeletePurchaseButton } from "./DeletePurchaseButton";

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
    const purchases = await prisma.purchase.findMany({
        include: {
            supplier: true,
            instances: true,
        },
        orderBy: {
            date: 'desc'
        }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Link href="/inventory" className="p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Historial de Compras
                    </h1>
                    <p className="text-slate-500 text-sm">Registro de Ingresos de Mercancía</p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {purchases.length === 0 ? (
                    <div className="text-center p-12 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-400 font-bold uppercase">No hay compras registradas</p>
                        <Link href="/inventory/inbound" className="text-blue-600 text-xs font-bold mt-2 inline-block hover:underline">
                            Ir a Recepción de Compra &rarr;
                        </Link>
                    </div>
                ) : (
                    purchases.map(purchase => (
                        <div key={purchase.id} className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Badge className="bg-green-100 text-green-700 font-bold text-[10px] px-2">COMPLETADO</Badge>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{purchase.supplier.name}</span>
                                    </div>
                                    <p className="text-xs font-mono text-slate-500">{new Date(purchase.date).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Items</p>
                                        <p className="text-lg font-black text-slate-700 flex items-center justify-center gap-1">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            {purchase.instances.length}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Total</p>
                                        <p className="text-lg font-black text-slate-800 flex items-center justify-end gap-1">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            {new Intl.NumberFormat('es-CO', {
                                                style: 'currency',
                                                currency: 'COP',
                                                minimumFractionDigits: 0
                                            }).format(Number(purchase.totalCost))}
                                        </p>
                                    </div>
                                    <div className="pl-4 border-l border-slate-200">
                                        <DeletePurchaseButton purchaseId={purchase.id} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
