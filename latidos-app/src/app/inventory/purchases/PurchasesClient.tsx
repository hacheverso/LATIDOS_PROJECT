"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, DollarSign, Package, Download, CheckCircle, AlertTriangle, Eye, X, User, MessageSquare, ChevronDown, ChevronRight, Printer, Trash2 } from "lucide-react";
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
    attendant: string; // New field
    notes: string | null; // New field
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
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithRelations | null>(null);
    const [expandedModalGroups, setExpandedModalGroups] = useState<Record<string, boolean>>({});

    const generatePDF = (purchase: PurchaseWithRelations) => {
        import('jspdf').then(async jsPDFModule => {
            import('jspdf-autotable').then(autoTableModule => {
                const jsPDF = jsPDFModule.default;
                const doc = new jsPDF();

                // Helper to format currency
                const fmtMoney = (amount: number, currency: string) => {
                    return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: currency === 'COP' ? 0 : 2
                    }).format(amount);
                };

                doc.setFontSize(18);
                doc.text(`RECEPCIÓN #${purchase.receptionNumber || 'N/A'}`, 14, 20);

                doc.setFontSize(10);
                doc.text(`Fecha: ${new Date(purchase.date).toLocaleDateString()}`, 14, 28);
                doc.text(`Proveedor: ${purchase.supplier.name}`, 14, 34);
                doc.text(`Encargado: ${purchase.attendant || 'No registrado'}`, 14, 40);

                // Group Data for PDF
                const itemsMap = new Map();
                purchase.instances.forEach(inst => {
                    const key = inst.product.sku;
                    if (!itemsMap.has(key)) {
                        itemsMap.set(key, {
                            name: inst.product.name,
                            count: 0,
                            unitCostCOP: Number(inst.cost),
                            serials: []
                        });
                    }
                    const item = itemsMap.get(key);
                    item.count++;
                    item.serials.push(inst.serialNumber || 'N/A');
                });

                const tableRows: any[] = [];
                const rate = Number(purchase.exchangeRate) || 1;

                itemsMap.forEach((val) => {
                    const unitCost = purchase.currency === 'USD' ? val.unitCostCOP / rate : val.unitCostCOP;
                    const subtotal = unitCost * val.count;

                    tableRows.push([
                        val.name,
                        val.count,
                        fmtMoney(unitCost, purchase.currency),
                        fmtMoney(subtotal, purchase.currency)
                    ]);

                    // Add serials row if needed, but maybe just listing them in a separate block or relying on simple summary
                });

                (doc as any).autoTable({
                    startY: 50,
                    head: [['Producto', 'Cant.', `Costo ${purchase.currency}`, 'Subtotal']],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [22, 163, 74] } // Green-600
                });

                const finalY = (doc as any).lastAutoTable.finalY || 60;

                doc.text(`Observaciones: ${purchase.notes || 'Ninguna'}`, 14, finalY + 10);

                // Totals
                doc.setFontSize(12);
                doc.text(`Total Items: ${purchase.instances.length}`, 14, finalY + 25);
                const totalVal = purchase.currency === 'USD'
                    ? Number(purchase.totalCost) / rate
                    : Number(purchase.totalCost);
                doc.text(`Total Valor: ${fmtMoney(totalVal, purchase.currency)}`, 14, finalY + 32);

                doc.save(`Recepcion_${purchase.receptionNumber || 'Draft'}.pdf`);
            });
        });
    };

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
                        Encargado: p.attendant || "N/A", // New Column
                        Observaciones: p.notes || "N/A", // New Column
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

    const [searchTerm, setSearchTerm] = useState("");

    // Reset search when modal opens/closes
    const handleOpenModal = (purchase: PurchaseWithRelations) => {
        setSearchTerm("");
        setSelectedPurchase(purchase);
    }

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
                                <div className="flex flex-col gap-2">
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
                                    <div className="flex items-center gap-3">
                                        <p suppressHydrationWarning className="text-xs font-mono text-slate-500">{new Date(purchase.date).toLocaleString()}</p>
                                        {purchase.attendant && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <User className="w-3 h-3" /> Recibido por: {purchase.attendant.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
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
                                        <button
                                            onClick={() => handleOpenModal(purchase)}
                                            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-sm"
                                            title="Ver Detalle"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {purchase.status === 'DRAFT' && (
                                            <button
                                                onClick={() => handleConfirm(purchase.id, purchase.receptionNumber || "")}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all animate-pulse"
                                            >
                                                CONFIRMAR
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

            {/* Purchase Detail Modal */}
            {selectedPurchase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">

                        {/* 1. Sticky Header */}
                        <div className="shrink-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 p-6 flex justify-between items-start rounded-t-3xl z-10">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                    Detalle de Recepción
                                </h2>
                                <p className="text-sm font-bold text-slate-400 uppercase">
                                    #{selectedPurchase.receptionNumber || "N/A"} • {new Date(selectedPurchase.date).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPurchase(null)}
                                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* 2. Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

                            {/* Attendant & Supplier Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3 h-3" /> Encargado
                                    </label>
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <p className="text-base font-black text-blue-900 uppercase">
                                            {selectedPurchase.attendant?.replace('_', ' ') || "NO REGISTRADO"}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Proveedor
                                    </label>
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                        <p className="text-base font-black text-slate-700 uppercase">
                                            {selectedPurchase.supplier.name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Observations (if any) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Observaciones
                                </label>
                                <div className={`p-4 rounded-2xl border ${selectedPurchase.notes ? 'bg-yellow-50/50 border-yellow-100' : 'bg-slate-50 border-slate-100'}`}>
                                    {selectedPurchase.notes ? (
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedPurchase.notes}
                                        </p>
                                    ) : (
                                        <p className="text-sm font-bold text-slate-300 italic uppercase">
                                            Sin observaciones.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ITEM TABLE SECTION */}
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur z-0 py-2">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Detalle de Productos
                                    </h3>

                                    {/* 3. Internal Search */}
                                    <div className="relative group w-full md:w-64">
                                        <input
                                            type="text"
                                            placeholder="Buscar producto o SKU..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider whitespace-nowrap">Producto</th>
                                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-center whitespace-nowrap">Cant.</th>
                                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right whitespace-nowrap">Costo Unit.</th>
                                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right whitespace-nowrap">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {/* Logic to group instances + Filter */}
                                                {(() => {
                                                    const grouped = Object.values(selectedPurchase.instances.reduce((acc: any, inst) => {
                                                        if (!acc[inst.product.sku]) {
                                                            acc[inst.product.sku] = {
                                                                sku: inst.product.sku,
                                                                name: inst.product.name,
                                                                count: 0,
                                                                totalCost: 0,
                                                                unitCostCOP: Number(inst.cost),
                                                                serials: []
                                                            };
                                                        }
                                                        acc[inst.product.sku].count++;
                                                        acc[inst.product.sku].totalCost += Number(inst.cost);
                                                        acc[inst.product.sku].serials.push(inst);
                                                        return acc;
                                                    }, {}));

                                                    // Filter based on search term
                                                    const filtered = grouped.filter((g: any) =>
                                                        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        g.sku.toLowerCase().includes(searchTerm.toLowerCase())
                                                    );

                                                    if (filtered.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                                                                    No se encontraron productos que coincidan con &quot;{searchTerm}&quot;
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return filtered.map((group: any) => {
                                                        const isExpanded = expandedModalGroups[group.sku];
                                                        const rate = Number(selectedPurchase.exchangeRate) || 1;
                                                        const unitCost = selectedPurchase.currency === 'USD'
                                                            ? group.unitCostCOP / rate
                                                            : group.unitCostCOP;
                                                        const subtotal = selectedPurchase.currency === 'USD'
                                                            ? group.totalCost / rate
                                                            : group.totalCost;

                                                        return (
                                                            <Fragment key={group.sku}>
                                                                <tr className="hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <button
                                                                                onClick={() => setExpandedModalGroups(prev => ({ ...prev, [group.sku]: !prev[group.sku] }))}
                                                                                className="p-1 rounded-full hover:bg-slate-200 transition-colors shrink-0"
                                                                            >
                                                                                {isExpanded ?
                                                                                    <ChevronDown className="w-4 h-4 text-blue-500" /> :
                                                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                                                                                }
                                                                            </button>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-slate-700 truncate">{group.name}</div>
                                                                                <div className="text-[10px] font-mono text-slate-400">{group.sku}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="inline-flex items-center justify-center min-w-[30px] h-6 px-2 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                                                                            {group.count}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                                                                        {new Intl.NumberFormat(selectedPurchase.currency === 'USD' ? 'en-US' : 'es-CO', {
                                                                            style: 'currency',
                                                                            currency: selectedPurchase.currency,
                                                                            maximumFractionDigits: 2
                                                                        }).format(unitCost)}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                        {new Intl.NumberFormat(selectedPurchase.currency === 'USD' ? 'en-US' : 'es-CO', {
                                                                            style: 'currency',
                                                                            currency: selectedPurchase.currency,
                                                                            maximumFractionDigits: 2
                                                                        }).format(subtotal)}
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr className="bg-slate-50/80 shadow-inner">
                                                                        <td colSpan={4} className="px-6 py-4">
                                                                            <div className="pl-9">
                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Seriales / IMEIs ({group.serials.length})</p>
                                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                                    {group.serials.map((s: any, idx: number) => (
                                                                                        <div key={idx} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-600 flex items-center gap-2 truncate">
                                                                                            <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">{idx + 1}</span>
                                                                                            <span className="truncate">{s.serialNumber || 'N/A'}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Sticky Footer */}
                        <div className="shrink-0 bg-slate-50 border-t border-slate-100 p-4 md:p-6 rounded-b-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
                            <div className="flex items-center gap-4 order-2 md:order-1">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Items</span>
                                    <span className="text-xl font-black text-slate-800">{selectedPurchase.instances.length}</span>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Valor</span>
                                    <span className="text-xl font-black text-green-600">
                                        {new Intl.NumberFormat('es-CO', {
                                            style: 'currency',
                                            currency: 'COP',
                                            minimumFractionDigits: 0
                                        }).format(Number(selectedPurchase.totalCost))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 order-1 md:order-2 justify-end w-full md:w-auto">
                                <Link href={`/inventory/inbound?edit=${selectedPurchase.id}`} className="hidden md:flex text-xs font-bold text-blue-600 hover:text-blue-800 uppercase items-center gap-2 mr-4">
                                    <FileText className="w-4 h-4" /> Editar
                                </Link>

                                <button
                                    onClick={() => generatePDF(selectedPurchase)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Printer className="w-4 h-4" /> PDF
                                </button>

                                <button
                                    onClick={() => setSelectedPurchase(null)}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
