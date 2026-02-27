"use client";

import { useState, Fragment, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, DollarSign, Package, Download, CheckCircle, AlertTriangle, Eye, X, User, MessageSquare, ChevronDown, ChevronRight, Printer, Trash2, Plus, PackageCheck, Calendar as CalendarIcon, Filter, FileSpreadsheet } from "lucide-react";

// ... (lines 6-407 unchanged - handled by tool intelligently or I should split edits? Tool description says contiguous block. I need two edits: import and the button. So I should use multi_replace.)

import { Badge } from "@/components/ui/Badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeletePurchaseButton } from "./DeletePurchaseButton";
import * as XLSX from "xlsx";
import { confirmPurchase } from "@/app/inventory/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
    operator?: {
        name: string;
    } | null;
    instances: {
        id: string;
        serialNumber: string | null;
        cost: any;
        product: {
            sku: string;
            name: string;
            upc: string | null;
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
                const autoTable = autoTableModule.default;
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

                // PDF: Use operator name if available
                const finalAttendant = purchase.operator?.name || purchase.attendant || 'No registrado';
                doc.text(`Encargado: ${finalAttendant}`, 14, 40);

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

                    if (purchase.currency === 'USD') {
                        tableRows.push([
                            val.name,
                            val.count,
                            `${fmtMoney(unitCost, 'USD')}\n(${fmtMoney(val.unitCostCOP, 'COP')})`,
                            `${fmtMoney(subtotal, 'USD')}\n(${fmtMoney(val.unitCostCOP * val.count, 'COP')})`
                        ]);
                    } else {
                        tableRows.push([
                            val.name,
                            val.count,
                            fmtMoney(unitCost, purchase.currency),
                            fmtMoney(subtotal, purchase.currency)
                        ]);
                    }
                });

                autoTable(doc, {
                    startY: 50,
                    head: [[
                        'Producto',
                        'Cant.',
                        purchase.currency === 'USD' ? 'Costo (USD/COP)' : `Costo ${purchase.currency}`,
                        purchase.currency === 'USD' ? 'Subtotal (USD/COP)' : 'Subtotal'
                    ]],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [22, 163, 74] }, // Green-600
                    styles: { cellPadding: 2, fontSize: purchase.currency === 'USD' ? 8 : 9 }
                });

                const finalY = (doc as any).lastAutoTable?.finalY || 60;

                doc.text(`Observaciones: ${purchase.notes || 'Ninguna'}`, 14, finalY + 10);

                // Totals
                doc.setFontSize(12);
                doc.text(`Total Items: ${purchase.instances.length}`, 14, finalY + 25);
                const totalVal = purchase.currency === 'USD'
                    ? Number(purchase.totalCost) / rate
                    : Number(purchase.totalCost);

                if (purchase.currency === 'USD') {
                    doc.text(`Total Valor: ${fmtMoney(totalVal, 'USD')} / ${fmtMoney(Number(purchase.totalCost), 'COP')}`, 14, finalY + 32);
                } else {
                    doc.text(`Total Valor: ${fmtMoney(totalVal, purchase.currency)}`, 14, finalY + 32);
                }

                doc.save(`Recepcion_${purchase.receptionNumber || 'Draft'}.pdf`);
            });
        });
    };

    const handleDownloadDetailExcel = (purchase: PurchaseWithRelations) => {
        try {
            const rows: any[] = [];
            const rate = Number(purchase.exchangeRate) || 1;

            purchase.instances.forEach((inst: any) => {
                const costCOP = Number(inst.cost);
                const costUSD = costCOP / rate;

                rows.push({
                    "FECHA": new Date(purchase.date).toLocaleDateString(),
                    "SERIALES": inst.serialNumber || "N/A",
                    "UPC": inst.product?.upc || "N/A",
                    "SKU": inst.product?.sku || "N/A",
                    "NOMBRE": inst.product?.name || "N/A",
                    "COSTO EN USD": Number(costUSD.toFixed(2)),
                    "COSTO EN COP": costCOP
                });
            });

            if (rows.length === 0) {
                toast.error("No hay productos detallados en esta recepción.");
                return;
            }

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ingreso Seriales");

            XLSX.writeFile(wb, `Recepcion_Seriales_${purchase.receptionNumber || purchase.id.slice(0, 8)}.xlsx`);
            toast.success("Excel descargado correctamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar excel");
        }
    };

    const handleConfirm = async (id: string, receptionNum: string) => {
        // Validation before request
        if (!id) {
            toast.error("Error: ID de compra inválido");
            return;
        }

        // Use a persistent toast for confirmation or simple window.confirm with STRING (Fixed bug)
        // Since we want a "professional" feel but don't have a custom Confirm Dialog ready-to-use in this context without bigger refactor,
        // we will use window.confirm with a PROPER STRING first, then show loading toast.
        // Ideally, we would use a Dialog component, but fixing the bug is priority.
        const purchase = purchases.find(p => p.id === id);
        if (purchase) {
            const hasZeroCost = purchase.instances.some((i: any) => Number(i.cost) <= 0);
            if (hasZeroCost) {
                toast.error("No se puede confirmar: Hay productos con costo $0. Edite la recepción primero.");
                return;
            }
        }

        if (!window.confirm(`¿Confirmar recepción #${receptionNum || 'Generada'} y cargar al stock?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        const toastId = toast.loading("Confirmando recepción...");

        try {
            const result = await confirmPurchase(id);
            if (!result.success) {
                toast.error(result.error || "Error al confirmar", { id: toastId });
                return;
            }
            toast.success("Recepción confirmada y stock actualizado", { id: toastId });
            router.refresh();
        } catch (e: any) {
            console.error(e);
            const errorMsg = e.response?.data?.message || e.message || "Error desconocido";
            toast.error("Error inesperado: " + errorMsg, { id: toastId });
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
                        Encargado: p.operator?.name || p.attendant || "N/A", // EXPORT LOGIC UPDATED
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

    // --- FILTERING LOGIC ---
    const filteredPurchases = useMemo(() => {
        let items = purchases;

        if (startDate && endDate) {
            // Adjust dates for comparison
            // Start Date: 00:00:00
            // End Date: 23:59:59
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); // Ensure start of day (local) - parsing 'YYYY-MM-DD' might be UTC
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // Correct timezone offset issue if plain string
            const startStr = new Date(startDate + "T00:00:00");
            const endStr = new Date(endDate + "T23:59:59");

            items = items.filter(p => {
                const date = new Date(p.date);
                return date >= startStr && date <= endStr;
            });
        }

        return items;
    }, [purchases, startDate, endDate]);

    // --- METRICS CALCULATION ---
    const metrics = useMemo(() => {
        return filteredPurchases.reduce((acc: { totalCOP: number; totalUSD: number }, p: PurchaseWithRelations) => {
            // Total COP (Always stored in COP/Base)
            acc.totalCOP += Number(p.totalCost) || 0;

            // Total USD (Approximate based on stored exchange rate)
            // If p.currency is USD, we can back-calculate logic, OR simply convert totalCost / exchangeRate
            const rate = Number(p.exchangeRate) || 1;
            acc.totalUSD += (Number(p.totalCost) / rate);

            return acc;
        }, { totalCOP: 0, totalUSD: 0 });
    }, [filteredPurchases]);

    // --- QUICK FILTERS ---
    const handleQuickFilter = (range: 'today' | 'week' | 'month' | 'year') => {
        const now = new Date();
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let start = new Date();
        let end = new Date();

        if (range === 'today') {
            // Start/End is today
        } else if (range === 'week') {
            start.setDate(now.getDate() - 7);
        } else if (range === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        }

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    // Reset search when modal opens/closes
    const handleOpenModal = (purchase: PurchaseWithRelations) => {
        setSearchTerm("");
        setSelectedPurchase(purchase);
    }

    return (
        <div className="w-full px-6 mx-auto space-y-12">
            {/* KPI CARDS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Compras (COP)</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(metrics.totalCOP)}
                    </p>
                </div>
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Compras (USD)</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(metrics.totalUSD)}
                    </p>
                </div>
            </div>

            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            Historial de Compras
                        </h1>
                        <p className="text-muted text-sm font-medium">Registro de Ingresos y Control de Stock</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-surface p-1.5 rounded-xl border border-border shadow-sm ring-1 ring-slate-900/5 dark:ring-white/5">
                    {/* Date Filters + Quick Actions Unified */}
                    <div className="flex items-center gap-1">
                        {/* Quick Filters */}
                        <div className="flex items-center gap-1 pr-2 border-r border-border hidden sm:flex">
                            <button onClick={() => handleQuickFilter('today')} className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-muted transition-colors">Hoy</button>
                            <button onClick={() => handleQuickFilter('week')} className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-muted transition-colors">7 Días</button>
                            <button onClick={() => handleQuickFilter('month')} className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-muted transition-colors">Mes</button>
                        </div>

                        {/* Collapsible Date Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${startDate || endDate ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' : 'bg-white dark:bg-transparent text-muted hover:text-blue-600 dark:hover:text-blue-400 border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span>
                                        {startDate || endDate ? (
                                            <>
                                                {startDate ? new Date(startDate).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) : '...'}
                                                {' - '}
                                                {endDate ? new Date(endDate).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) : '...'}
                                            </>
                                        ) : 'Fechas'}
                                    </span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4 bg-surface shadow-xl border border-border" align="start">
                                <div className="flex flex-col gap-4">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        Filtrar por Rango
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Desde</label>
                                            <input
                                                type="date"
                                                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 block w-full"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Hasta</label>
                                            <input
                                                type="date"
                                                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 block w-full"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {(startDate || endDate) && (
                                        <button
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-tight self-end"
                                        >
                                            Limpiar Filtros
                                        </button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Actions Container */}
                    <div className="flex items-center gap-2 pl-2 border-l border-border">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exportar</span>
                        </button>

                        <Link
                            href="/inventory/inbound"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                        >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Recibir</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* List Header (Desktop) */}
            {
                filteredPurchases.length > 0 && (
                    <div className="hidden lg:grid grid-cols-[1.5fr_1fr_2fr_1fr_1.5fr_1fr] gap-6 px-6 py-5 bg-slate-50/80 dark:bg-[#1A1C1E]/80 border border-b-0 border-border rounded-t-2xl text-[10px] font-black text-muted uppercase tracking-widest backdrop-blur-sm">
                        <div className="flex items-center">Estado</div>
                        <div className="flex items-center">Referencia</div>
                        <div className="flex items-center">Registro / Recibido por</div>
                        <div className="flex items-center justify-center">Ítems</div>
                        <div className="flex items-center justify-center">Costo Total</div>
                        <div className="flex items-center justify-end">Acciones</div>
                    </div>
                )
            }

            {/* List */}
            <div className="space-y-4">
                {filteredPurchases.length === 0 ? (
                    <div className="text-center p-12 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-400 font-bold uppercase">No hay compras registradas en este rango</p>
                        <Link href="/inventory/inbound" className="text-blue-600 text-xs font-bold mt-2 inline-block hover:underline">
                            Ir a Recepción de Compra &rarr;
                        </Link>
                    </div>
                ) : (
                    filteredPurchases.map((purchase: PurchaseWithRelations) => (
                        <div key={purchase.id} className={`p-4 lg:px-6 lg:py-4 rounded-2xl border transition-all grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_2fr_1fr_1.5fr_1fr] gap-4 lg:gap-6 items-center ${purchase.status === 'DRAFT'
                            ? 'bg-yellow-50/50 dark:bg-[#2A2416] border-yellow-200 dark:border-yellow-900/50 shadow-sm'
                            : 'bg-surface hover:bg-slate-50 dark:hover:bg-white/5 border-border shadow-sm'
                            }`}>

                            {/* Rest of the Card ... Stays same but wrapper div needs closing */}
                            {/* Col 1: Status */}
                            <div className="flex flex-col gap-1 items-start">
                                {purchase.status === 'DRAFT' ? (
                                    <Badge className="bg-yellow-100 text-yellow-700 font-bold text-[10px] px-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> BORRADOR
                                    </Badge>
                                ) : (
                                    <Badge className="bg-green-100 text-green-700 font-bold text-[10px] px-2 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> COMPLETADO {purchase.receptionNumber ? `v${purchase.receptionNumber}` : ''}
                                    </Badge>
                                )}
                                {purchase.instances.some((i: any) => Number(i.cost) <= 0) && (
                                    <Badge className="bg-orange-100 text-orange-700 font-bold text-[10px] px-2 flex items-center gap-1 border border-orange-200">
                                        <AlertTriangle className="w-3 h-3" /> COSTO PENDIENTE
                                    </Badge>
                                )}
                            </div>

                            {/* Col 2: Reference */}
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tight">{purchase.supplier.name}</span>
                                <span className="text-[10px] font-mono text-muted">ID: {purchase.receptionNumber || purchase.id.slice(0, 8)}</span>
                            </div>

                            {/* Col 3: Registry */}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                    <span>{new Date(purchase.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{new Date(purchase.date).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {(purchase.operator?.name || purchase.attendant) && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <User className="w-3 h-3 text-blue-400" />
                                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                                            {purchase.operator?.name || purchase.attendant.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Col 4: Items (Centered) */}
                            <div className="flex items-center justify-start lg:justify-center">
                                <div className="flex items-center gap-2 bg-surface-hover px-3 py-1.5 rounded-lg">
                                    <Package className="w-4 h-4 text-muted" />
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{purchase.instances.length} ITEMS</span>
                                </div>
                            </div>

                            {/* Col 5: Cost (Centered) */}
                            <div className="flex flex-col items-start lg:items-center justify-center">
                                <div className="text-right lg:text-center">
                                    <p className="text-sm font-black text-slate-800 dark:text-white flex items-center lg:justify-center gap-1">
                                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-500" />
                                        {new Intl.NumberFormat('es-CO', {
                                            style: 'currency',
                                            currency: 'COP',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0
                                        }).format(Number(purchase.totalCost))}
                                    </p>

                                    {purchase.currency === 'USD' && (
                                        <p className="text-[10px] font-bold text-slate-400">
                                            USD {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: 'USD',
                                            }).format(Number(purchase.totalCost) / Number(purchase.exchangeRate))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Col 6: Actions */}
                            <div className="flex items-center justify-end gap-2 border-t lg:border-t-0 border-border pt-3 lg:pt-0 mt-2 lg:mt-0 w-full lg:w-auto">
                                <button
                                    onClick={() => handleOpenModal(purchase)}
                                    className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-muted hover:bg-slate-100 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Ver Detalle"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>

                                <Link
                                    href={`/inventory/inbound?edit=${purchase.id}`}
                                    className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-muted hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Editar Recepción"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                </Link>

                                {purchase.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handleConfirm(purchase.id, purchase.receptionNumber || "")}
                                        disabled={purchase.instances.some((i: any) => Number(i.cost) <= 0)}
                                        className={`p-2 rounded-lg transition-colors ${purchase.instances.some((i: any) => Number(i.cost) <= 0)
                                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                            : "bg-green-50 text-green-600 hover:bg-green-100 hover:shadow-sm"
                                            }`}
                                        title="Confirmar"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                )}

                                <DeletePurchaseButton purchaseId={purchase.id} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Purchase Detail Modal */}
            {
                selectedPurchase && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#131517] rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300 border dark:border-white/10">

                            {/* 1. Sticky Header */}
                            <div className="shrink-0 bg-slate-50/80 dark:bg-card/80 backdrop-blur-md border-b border-border p-6 flex justify-between items-start rounded-t-3xl z-10">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        Detalle de Recepción
                                    </h2>
                                    <p className="text-sm font-bold text-muted uppercase">
                                        #{selectedPurchase.receptionNumber || "N/A"} • {new Date(selectedPurchase.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedPurchase(null)}
                                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-muted hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* 2. Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

                                {/* Attendant & Supplier Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                            <User className="w-3 h-3" /> Encargado
                                        </label>
                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                            <p className="text-base font-black text-blue-900 dark:text-blue-300 uppercase">
                                                {selectedPurchase.attendant?.replace('_', ' ') || "NO REGISTRADO"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-3 h-3" /> Proveedor
                                        </label>
                                        <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-border">
                                            <p className="text-base font-black text-slate-700 dark:text-slate-300 uppercase">
                                                {selectedPurchase.supplier.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Observations (if any) */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" /> Observaciones
                                    </label>
                                    <div className={`p-4 rounded-2xl border ${selectedPurchase.notes ? 'bg-yellow-50/50 dark:bg-[#2A2416] border-yellow-100 dark:border-yellow-900/50' : 'bg-slate-50 dark:bg-white/5 border-border'}`}>
                                        {selectedPurchase.notes ? (
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {selectedPurchase.notes}
                                            </p>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-300 dark:text-slate-600 italic uppercase">
                                                Sin observaciones.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* ITEM TABLE SECTION */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 dark:bg-[#131517]/95 backdrop-blur z-0 py-2">
                                        <h3 className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-3 h-3" /> Detalle de Productos
                                        </h3>

                                        {/* 3. Internal Search */}
                                        <div className="relative group w-full md:w-64">
                                            <input
                                                type="text"
                                                placeholder="Buscar producto o SKU..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border-border rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-2.5 text-muted group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-white/5 border-b border-border">
                                                    <tr>
                                                        <th className="px-6 py-3 font-bold text-muted uppercase text-[10px] tracking-wider whitespace-nowrap">Producto</th>
                                                        <th className="px-6 py-3 font-bold text-muted uppercase text-[10px] tracking-wider text-center whitespace-nowrap">Cant.</th>
                                                        <th className="px-6 py-3 font-bold text-muted uppercase text-[10px] tracking-wider text-right whitespace-nowrap">Costo Unit.</th>
                                                        <th className="px-6 py-3 font-bold text-muted uppercase text-[10px] tracking-wider text-right whitespace-nowrap">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
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
                                                                    <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <button
                                                                                    onClick={() => setExpandedModalGroups(prev => ({ ...prev, [group.sku]: !prev[group.sku] }))}
                                                                                    className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0"
                                                                                >
                                                                                    {isExpanded ?
                                                                                        <ChevronDown className="w-4 h-4 text-blue-500 dark:text-blue-400" /> :
                                                                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
                                                                                    }
                                                                                </button>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{group.name}</div>
                                                                                    <div className="text-[10px] font-mono text-muted">{group.sku}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-center">
                                                                            <span className="inline-flex items-center justify-center min-w-[30px] h-6 px-2 rounded-full bg-slate-100 dark:bg-white/10 text-muted font-bold text-xs">
                                                                                {group.count}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="font-mono font-medium text-muted">
                                                                                    {new Intl.NumberFormat(selectedPurchase.currency === 'USD' ? 'en-US' : 'es-CO', {
                                                                                        style: 'currency',
                                                                                        currency: selectedPurchase.currency,
                                                                                        maximumFractionDigits: 2
                                                                                    }).format(unitCost)}
                                                                                </span>
                                                                                {selectedPurchase.currency === 'USD' && (
                                                                                    <span className="text-[10px] font-mono text-muted font-bold">
                                                                                        {new Intl.NumberFormat('es-CO', {
                                                                                            style: 'currency',
                                                                                            currency: 'COP',
                                                                                            minimumFractionDigits: 0
                                                                                        }).format(group.unitCostCOP)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="font-mono font-bold text-slate-800 dark:text-white">
                                                                                    {new Intl.NumberFormat(selectedPurchase.currency === 'USD' ? 'en-US' : 'es-CO', {
                                                                                        style: 'currency',
                                                                                        currency: selectedPurchase.currency,
                                                                                        maximumFractionDigits: 2
                                                                                    }).format(subtotal)}
                                                                                </span>
                                                                                {selectedPurchase.currency === 'USD' && (
                                                                                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                                                                                        {new Intl.NumberFormat('es-CO', {
                                                                                            style: 'currency',
                                                                                            currency: 'COP',
                                                                                            minimumFractionDigits: 0
                                                                                        }).format(group.totalCost)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    {isExpanded && (
                                                                        <tr className="bg-slate-50/80 dark:bg-black/20 shadow-inner">
                                                                            <td colSpan={4} className="px-6 py-4">
                                                                                <div className="pl-9">
                                                                                    <p className="text-[10px] font-bold text-muted uppercase mb-2">Seriales / IMEIs ({group.serials.length})</p>
                                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                                        {group.serials.map((s: any, idx: number) => (
                                                                                            <div key={idx} className="bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-muted flex items-center gap-2 truncate">
                                                                                                <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-muted shrink-0">{idx + 1}</span>
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
                            <div className="shrink-0 bg-slate-50 dark:bg-card border-t border-border p-4 md:p-6 rounded-b-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
                                <div className="flex items-center gap-4 order-2 md:order-1">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted uppercase block">Total Items</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{selectedPurchase.instances.length}</span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
                                    <div>
                                        <span className="text-[10px] font-bold text-muted uppercase block">Total Valor</span>
                                        <span className="text-xl font-black text-green-600 dark:text-green-500">
                                            {new Intl.NumberFormat('es-CO', {
                                                style: 'currency',
                                                currency: 'COP',
                                                minimumFractionDigits: 0
                                            }).format(Number(selectedPurchase.totalCost))}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 order-1 md:order-2 justify-end w-full md:w-auto">
                                    <Link href={`/inventory/inbound?edit=${selectedPurchase.id}`} className="hidden md:flex text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 uppercase items-center gap-2 mr-4">
                                        <FileText className="w-4 h-4" /> Editar
                                    </Link>

                                    <button
                                        onClick={() => handleDownloadDetailExcel(selectedPurchase)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs flex items-center gap-2 transition-colors shadow-sm"
                                        title="Descargar detalle en Excel"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" /> Excel
                                    </button>

                                    <button
                                        onClick={() => generatePDF(selectedPurchase)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 rounded-xl font-bold uppercase text-xs flex items-center gap-2 transition-colors shadow-sm border border-border"
                                        title="Descargar comprobante en PDF"
                                    >
                                        <Printer className="w-4 h-4" /> PDF
                                    </button>

                                    <button
                                        onClick={() => setSelectedPurchase(null)}
                                        className="px-6 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold uppercase text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
