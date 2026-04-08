"use client";

import { useEffect, useState } from "react";
import { getPreOrders, deletePreOrder } from "../actions";
import { PackageOpen, Clock, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function PreOrdersPage() {
    const [preOrders, setPreOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getPreOrders();
        setPreOrders(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta Pre-Orden? Esta acción no se puede deshacer.")) return;
        await deletePreOrder(id);
        loadData();
    };

    if (loading) return <div className="p-8 animate-pulse text-center font-bold text-muted">Cargando Pre-Órdenes...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Pre-Órdenes Pendiendes</h1>
                    <p className="text-secondary text-sm">Convierte reservas sin stock a facturas oficiales cuando llegue la mercancía.</p>
                </div>
                <Link href="/sales/new" className="bg-header border border-border px-4 py-2 rounded-xl text-primary font-bold text-sm shadow-sm hover:bg-card transition-colors">
                    Volver al POS
                </Link>
            </div>

            {preOrders.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <PackageOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                    <h2 className="text-xl font-black text-primary">No hay Pre-Órdenes activas</h2>
                    <p className="text-secondary mt-2">Los clientes que reserven mercancía sin stock aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {preOrders.map(order => (
                        <div key={order.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-primary uppercase truncate">{order.customer.name}</h3>
                                    <p className="text-xs text-muted font-mono">{order.customer.taxId}</p>
                                </div>
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-black text-[10px] uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Pendiente
                                </span>
                            </div>

                            <div className="flex-1 space-y-2 mb-6">
                                {order.items.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 border-dashed">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="font-bold text-xs bg-header px-1.5 py-0.5 rounded text-primary border border-border">x{item.quantity}</span>
                                            <span className="truncate text-secondary uppercase text-xs">{item.productName || item.product?.name || "Ref: " + item.productId}</span>
                                        </div>
                                        <span className="font-bold text-primary ml-2">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto">
                                <div className="flex justify-between items-center mb-4 text-xs font-bold text-muted">
                                    <span>Total Cotizado:</span>
                                    <span className="text-lg font-black text-primary">{formatCurrency(order.total)}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDelete(order.id)}
                                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 bg-header border border-border rounded-xl transition-colors"
                                        title="Descartar Pre-Orden"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <Link 
                                        href="/sales/new" 
                                        className="flex-1 bg-primary text-inverse font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                        title="Para convertir, diríjase al POS e ingrese los productos cuando haya stock válido."
                                    >
                                        Facturar Oficialmente <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
