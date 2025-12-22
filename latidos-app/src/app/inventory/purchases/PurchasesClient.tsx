"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, DollarSign, Package, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DeletePurchaseButton } from "./DeletePurchaseButton";
import * as XLSX from "xlsx";
import { confirmPurchase } from "@/app/inventory/actions";
import { useRouter } from "next/navigation";

// Define Types based on Prisma include
type PurchaseWithRelations = {
    id: string;
    date: Date;
    status: string;
    totalCost: any; // Decimal
    currency: string;
    exchangeRate: any; // Decimal
    receptionNumber: string | null;
    supplier: {
        name: string;
        nit: string;
    };
    instances: {
        id: string;
        serialNumber: string | null;
        cost: any;
        product: {
            sku: string;
            name: string;
        }
    }[]; // We need to include product in the fetch!
};

export default function PurchasesClient({ purchases }: { purchases: any[] }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);

    const handleConfirm = async (id: string, receptionNum: string) => {
        if (!confirm({
            title: "Confirmar Ingreso al Stock",
            body: `¿Estás seguro de confirmar la recepción #${receptionNum}? Esto habilitará los productos en el inventario.`
        } as any)) {
            // Native confirm
            if (!window.confirm(`¿Confirmar recepción #${receptionNum || 'Generada'} y cargar al stock?`)) return;
        }

        try {
            const result = await confirmPurchase(id);
            if (!result.success) {
                alert("Error al confirmar: " + result.error);
                return;
            }
            router.refresh();
        } catch (e) {
            console.error(e);
            alert("Error inesperado: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleExport = () => {
        setIsExporting(true);
        try {
            // 1. Filter
            let filtered = purchases;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59); // End of day
                filtered = purchases.filter(p => {
                    const d = new Date(p.date);
                    return d >= start && d <= end;
                });
            }

            // 2. Flatten Data
            const rows: any[] = [];
            filtered.forEach(p => {
                p.instances.forEach((i: any) => {
                    const costCOP = Number(i.cost);
                    const rate = Number(p.exchangeRate) || 1;
                    rows.push({
                        Fecha: new Date(p.date).toLocaleDateString(),
                        Recepcion: p.receptionNumber || "N/A",
                        Proveedor: p.supplier.name,
                        UPC: i.product?.upc || "N/A",
                        SKU: i.product?.sku || "N/A",
                        Producto: i.product?.name || "N/A",
                        Serial: i.serialNumber || "N/A",
                        "Costo USD": (costCOP / rate).toFixed(2),
                        TRM: rate,
                        "Costo COP": costCOP
                    });
                });
            });

            if (rows.length === 0) {
                alert("No hay datos para exportar en el rango seleccionado.");
                setIsExporting(false);
                return;
            }

            // 3. Generate Sheet
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ingresos");

            // 4. Download
            XLSX.writeFile(wb, `Reporte_Ingresos_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (e) {
            console.error(e);
            alert("Error al exportar excel");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <FileText className="w-8 h-8 text-blue-600" />
                            Historial de Compras
                        </h1>
                        <p className="text-slate-500 text-sm">Registro de Ingresos y Control de Stock</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white/50 p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 px-2">
                        <label className="text-xs font-bold text-slate-500">Desde:</label>
                        <input
                            type="date"
                            className="text-xs bg-transparent border-none focus:ring-0 text-slate-700"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex items-center gap-2 px-2">
                        <label className="text-xs font-bold text-slate-500">Hasta:</label>
                        <input
                            type="date"
                            className="text-xs bg-transparent border-none focus:ring-0 text-slate-700"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="ml-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        {isExporting ? "Exportando..." : "Exportar Excel"}
                    </button>
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
                        <div key={purchase.id} className={`p-6 rounded-2xl border transition-all ${purchase.status === 'DRAFT'
                            ? 'bg-yellow-50/50 border-yellow-200 shadow-sm'
                            : 'bg-white/60 backdrop-blur-xl border-white/40 shadow-sm hover:shadow-md'
                            }`}>
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        {purchase.status === 'DRAFT' ? (
                                            <Badge className="bg-yellow-100 text-yellow-700 font-bold text-[10px] px-2 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> BORRADOR / CONFIRMACIÓN PENDIENTE
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-700 font-bold text-[10px] px-2 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> COMPLETADO {purchase.receptionNumber ? `v${purchase.receptionNumber}` : ''}
                                            </Badge>
                                        )}
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{purchase.supplier.name}</span>
                                        {purchase.receptionNumber && (
                                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                #{purchase.receptionNumber}
                                            </span>
                                        )}
                                    </div>
                                    <p suppressHydrationWarning className="text-xs font-mono text-slate-500">{new Date(purchase.date).toLocaleString()}</p>
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
                                        <div className="flex flex-col items-end">
                                            <p className="text-lg font-black text-slate-800 flex items-center justify-end gap-1">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                                {new Intl.NumberFormat('es-CO', {
                                                    style: 'currency',
                                                    currency: 'COP',
                                                    minimumFractionDigits: 0
                                                }).format(Number(purchase.totalCost))}
                                            </p>

                                            {purchase.currency === 'USD' && (
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    USD {new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                    }).format(Number(purchase.totalCost) / Number(purchase.exchangeRate))}
                                                </p>
                                            )}

                                            <Badge className={`mt-1 text-[9px] font-bold px-1 py-0 ${purchase.currency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                {purchase.currency} {purchase.currency === 'USD' ? `(TRM: $${Number(purchase.exchangeRate).toLocaleString()})` : ''}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="pl-4 border-l border-slate-200 flex items-center gap-2">
                                        {purchase.status === 'DRAFT' && (
                                            <button
                                                onClick={() => handleConfirm(purchase.id, purchase.receptionNumber || "")}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all animate-pulse"
                                            >
                                                CONFIRMAR INGRESO
                                            </button>
                                        )}

                                        <Link
                                            href={`/inventory/inbound?edit=${purchase.id}`}
                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm"
                                            title="Editar Recepción"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </Link>
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
