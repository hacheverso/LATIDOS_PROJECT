"use client";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, DollarSign, Wallet, AlertCircle, CheckCircle2, Download, FileSpreadsheet, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSaleById, deleteSale, bulkDeleteSales } from "./actions";
import EditSaleModal from "./components/EditSaleModal";
import AddPaymentModal from "@/components/sales/AddPaymentModal"; // UNIFIED MODAL
import ProtectedActionModal from "./components/ProtectedActionModal";
import { BulkDebtImportModal } from "./components/BulkDebtImportModal";
import { Edit, Loader2, Trash2, X, ShieldAlert, Printer, MessageCircle, XCircle } from "lucide-react";
import { printReceipt } from "./components/printUtils";
import { shareReceiptViaWhatsApp } from "./components/whatsappUtils";
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isSameDay, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// Helper for Highlighting
const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight || !text) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="bg-yellow-200 text-yellow-800 font-bold px-0.5 rounded shadow-sm">{part}</span> : part
            )}
        </>
    );
};

interface Sale {
    id: string;
    date: string; // ISO String
    total: number;
    amountPaid: number;
    balance: number;
    paymentMethod: string;
    itemCount: number;
    status: string; // PAID, PARTIAL, PENDING
    customer: {
        id: string;
        name: string;
        taxId: string;
        creditBalance?: number;
        companyName?: string;
    };
    invoiceNumber?: string;
    dueDate?: string; // ISO String from JSON serialization
    instances?: { product: { name: string } }[];
    operatorName?: string;
}

interface SalesTableProps {
    initialSales: Sale[];
}

export default function SalesTable({ initialSales }: SalesTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sync with URL
    const currentSearch = searchParams.get('search') || "";
    const currentStatus = searchParams.get('status') || "ALL";

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Filter Logic
    const processedSales = useMemo(() => {
        let sales = [...initialSales];

        // Search
        if (currentSearch.trim()) {
            const lowerSearch = currentSearch.toLowerCase();
            sales = sales.filter(s =>
                s.customer.name.toLowerCase().includes(lowerSearch) ||
                (s.customer.companyName && s.customer.companyName.toLowerCase().includes(lowerSearch)) ||
                (s.customer.taxId && s.customer.taxId.toLowerCase().includes(lowerSearch)) ||
                (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(lowerSearch)) ||
                s.id.toLowerCase().includes(lowerSearch) ||
                (s.instances && s.instances.some(i => i.product.name.toLowerCase().includes(lowerSearch)))
            );
        }

        // Status Filter
        if (currentStatus !== "ALL") {
            sales = sales.filter(s => s.status === currentStatus);
        }

        // Sorting
        if (sortConfig) {
            sales.sort((a: any, b: any) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sales;
    }, [initialSales, currentSearch, currentStatus, sortConfig]);

    // Handle Sort
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name: string) => {
        if (!sortConfig || sortConfig.key !== name) {
            return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400" />;
        }
        return sortConfig.direction === 'asc' ?
            <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> :
            <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    // Selection Logic
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelectAll = () => {
        if (selectedIds.length === processedSales.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(processedSales.map(s => s.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(s => s !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Action Logic
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editingSale, setEditingSale] = useState<any | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // PAYMENT MODAL STATE
    const [paymentModalState, setPaymentModalState] = useState<{
        isOpen: boolean,
        saleId?: string,
        balance?: number,
        customerCredit?: number,
        bulk?: boolean
    }>({ isOpen: false });

    // OPEN SINGLE PAYMENT
    const openSinglePayment = (e: React.MouseEvent, sale: Sale) => {
        e.stopPropagation();
        setPaymentModalState({
            isOpen: true,
            saleId: sale.id,
            balance: sale.balance,
            customerCredit: sale.customer.creditBalance || 0, // Using prop from updated interface
            bulk: false
        });
    };

    // OPEN BULK PAYMENT
    const openBulkPayment = () => {
        const selectedItems = processedSales.filter(s => selectedIdSet.has(s.id));
        // We use the first customer's credit as a best guess (validation happens in modal)
        const credit = selectedItems[0]?.customer?.creditBalance || 0;

        setPaymentModalState({
            isOpen: true,
            saleId: undefined,
            balance: undefined,
            customerCredit: credit,
            bulk: true
        });
    };


    const handleEdit = async (e: React.MouseEvent, saleId: string) => {
        e.stopPropagation();
        if (loadingId) return;

        setLoadingId(saleId);
        try {
            const fullSale = await getSaleById(saleId);
            setEditingSale(fullSale);
        } catch (error) {
            console.error("Error fetching sale:", error);
            alert("Error al cargar la venta. Intente de nuevo.");
        } finally {
            setLoadingId(null);
        }
    };
    const handleDelete = async () => {
        if (!saleToDelete) return;
        setLoadingId(saleToDelete);
        await deleteSale(saleToDelete);
        setSaleToDelete(null);
        setLoadingId(null);
        router.refresh();
    };

    const handleBulkDelete = async (user: any, pin: string) => {
        if (selectedIds.length === 0) return;
        setIsBulkDeleteModalOpen(false);
        await bulkDeleteSales(selectedIds, pin);
        setSelectedIds([]);
        router.refresh();
    };

    // Check consistency for bulk actions
    // Check consistency for bulk actions
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const { allSameCustomer, hasDebt, totalSelectedDebt } = useMemo(() => {
        if (selectedIds.length === 0) return { allSameCustomer: false, hasDebt: false, totalSelectedDebt: 0 };

        const selectedItems = processedSales.filter(s => selectedIdSet.has(s.id));
        const firstCustomerId = selectedItems[0]?.customer.id;
        const allSame = selectedItems.every(s => s.customer.id === firstCustomerId);
        const debt = selectedItems.some(s => s.balance > 0);
        const total = selectedItems.reduce((acc, s) => acc + s.balance, 0);

        return { allSameCustomer: allSame, hasDebt: debt, totalSelectedDebt: total };
    }, [processedSales, selectedIdSet, selectedIds.length]);


    // Search Debounce Logic
    const [searchTerm, setSearchTerm] = useState(currentSearch);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== currentSearch) {
                const params = new URLSearchParams(searchParams);
                if (searchTerm) {
                    params.set('search', searchTerm);
                } else {
                    params.delete('search');
                }
                router.replace(`?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentSearch, router, searchParams]);


    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : startOfYear(new Date()),
        to: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date(),
    });

    const handleDateFilter = (preset?: 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CLEAR', customRange?: { from: Date, to: Date }) => {
        const params = new URLSearchParams(searchParams);
        let start: Date | undefined;
        let end: Date | undefined;
        const now = new Date();

        if (customRange) {
            start = customRange.from;
            end = customRange.to;
        } else if (preset) {
            switch (preset) {
                case 'TODAY':
                    start = startOfDay(now);
                    end = endOfDay(now);
                    break;
                case 'WEEK':
                    start = subDays(startOfDay(now), 7);
                    end = endOfDay(now);
                    break;
                case 'MONTH':
                    start = startOfMonth(now);
                    end = endOfDay(now);
                    break;
                case 'YEAR':
                    start = startOfYear(now);
                    end = endOfDay(now);
                    break;
                case 'CLEAR':
                    start = undefined;
                    end = undefined;
                    break;
            }
        }

        if (start) params.set('startDate', start.toISOString());
        else params.delete('startDate');

        if (end) params.set('endDate', end.toISOString());
        else params.delete('endDate');

        setDateRange({ from: start, to: end });
        router.replace(`?${params.toString()}`);
    };

    // EXPORT TO EXCEL
    const handleExportExcel = () => {
        import("xlsx").then(XLSX => {
            const dataToExport = processedSales.map(sale => {
                const itemDetails = sale.instances?.map(i => i.product.name).join(", ") || "";
                return {
                    "Factura": sale.invoiceNumber || "N/A",
                    "Fecha": format(new Date(sale.date), "dd/MM/yyyy", { locale: es }),
                    "Hora": format(new Date(sale.date), "hh:mm a", { locale: es }),
                    "Cliente": sale.customer.name,
                    "Documento": sale.customer.taxId,
                    "Items": itemDetails,
                    "Total": sale.total,
                    "Pagado": sale.amountPaid,
                    "Deuda": sale.balance,
                    "Estado": sale.status,
                    "Vendedor/Operador": sale.operatorName || "N/A"
                };
            });

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ventas");

            // Auto-width columns (simple estimation)
            const wscols = [
                { wch: 10 }, // Ref
                { wch: 15 }, // Date
                { wch: 10 }, // Time
                { wch: 30 }, // Client
                { wch: 15 }, // ID
                { wch: 40 }, // Items
                { wch: 15 }, // Total
                { wch: 15 }, // Paid
                { wch: 15 }, // Balance
                { wch: 10 }, // Status
                { wch: 20 }  // Operator
            ];
            ws['!cols'] = wscols;

            XLSX.writeFile(wb, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
        });
    };

    return (
        <div className="bg-surface rounded-3xl shadow-sm border border-border flex flex-col h-[calc(100vh-210px)] relative">

            {/* Header / Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Search Input */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, serial, factura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">

                    {/* Date Filters */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateFilter('TODAY')}
                            className={cn("h-7 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm px-2",
                                isSameDay(dateRange.from || new Date(0), new Date()) && isSameDay(dateRange.to || new Date(0), new Date()) ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
                            )}
                        >
                            Hoy
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateFilter('WEEK')}
                            className={cn("h-7 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm px-2",
                                dateRange.from && isSameDay(dateRange.from, subDays(startOfDay(new Date()), 7)) ? "bg-white shadow-sm text-blue-600 font-bold" : "text-slate-500"
                            )}
                        >
                            7D
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateFilter('MONTH')}
                            className={cn("h-7 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm px-2",
                                dateRange.from && isSameDay(dateRange.from, startOfMonth(new Date())) ? "bg-white shadow-sm text-blue-600 font-bold" : "text-slate-500"
                            )}
                        >
                            Mes
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateFilter('YEAR')}
                            className={cn("h-7 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm px-2",
                                dateRange.from && isSameDay(dateRange.from, startOfYear(new Date())) ? "bg-white shadow-sm text-blue-600 font-bold" : "text-slate-500"
                            )}
                        >
                            Año
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-7 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm px-2 gap-1",
                                        (!dateRange.from || !isSameDay(dateRange.from, new Date()) && !isSameDay(dateRange.from, subDays(startOfDay(new Date()), 7)) && !isSameDay(dateRange.from, startOfMonth(new Date()))) ? "text-blue-600 bg-white shadow-sm font-bold" : "text-slate-500"
                                    )}
                                >
                                    <CalendarIcon className="w-3 h-3" />
                                    <span className="hidden sm:inline">Pers.</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-surface shadow-xl border border-border" align="end" side="bottom" collisionPadding={10}>
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange.from}
                                    selected={{ from: dateRange.from, to: dateRange.to }}
                                    onSelect={(range) => {
                                        if (range?.from && range?.to) {
                                            handleDateFilter(undefined, { from: range.from, to: range.to });
                                        }
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        {(dateRange.from || dateRange.to) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDateFilter('CLEAR')}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-1"
                                title="Limpiar filtros de fecha"
                            >
                                <XCircle className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Import Button */}
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl text-xs font-bold uppercase transition-colors whitespace-nowrap"
                        title="Importar Cartera Activa desde Excel/CSV"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden md:inline">Importar Cartera</span>
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase transition-colors whitespace-nowrap"
                        title="Exportar tabla actual a Excel"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">Exportar Excel</span>
                    </button>

                    {/* Existing Selection Toolbar (only shows when items selected) */}
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white pl-6 pr-2 py-2 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[90%] md:w-auto border border-white/10 ring-1 ring-black/50">
                    <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-4 mr-auto md:mr-0">
                        <span className="font-bold text-sm text-white">
                            {selectedIds.length} seleccionados
                        </span>
                        <span className="text-xs text-slate-400 font-medium hidden md:inline">|</span>
                        <span className="text-xs text-slate-300">
                            Pendiente: <strong className="text-rose-400 text-sm">${new Intl.NumberFormat('es-CO').format(totalSelectedDebt)}</strong>
                        </span>
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                        {/* Only show "Abonar" if there's debt */}
                        {hasDebt && (
                            <button
                                onClick={openBulkPayment}
                                disabled={!allSameCustomer}
                                className={cn(
                                    "flex items-center gap-2 text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95",
                                    allSameCustomer
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-900/30"
                                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                )}
                                title={!allSameCustomer ? "Solo se puede abonar a facturas del mismo cliente" : "Abonar a seleccionados"}
                            >
                                <Wallet className="w-4 h-4" />
                                <span className="hidden md:inline">Abonar</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                selectedIds.forEach(id => printReceipt(id));
                            }}
                            className="flex items-center gap-2 text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg hover:shadow-indigo-900/30 active:scale-95"
                            title="Imprimir Seleccionados"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden md:inline">Imprimir</span>
                        </button>

                        <button
                            onClick={() => setIsBulkDeleteModalOpen(true)}
                            className="flex items-center gap-2 text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg hover:shadow-rose-900/30 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden md:inline">Eliminar</span>
                        </button>

                        <button
                            onClick={() => setSelectedIds([])}
                            className="hover:bg-white/10 text-slate-400 hover:text-white p-2 rounded-full transition-colors ml-2"
                            title="Deseleccionar todo"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Table Area */}
            <div className="flex-1 overflow-auto rounded-t-3xl scroller">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-black/20 sticky top-0 z-10 shadow-sm border-b dark:border-white/5">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === processedSales.length && processedSales.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-blue-600 dark:bg-black/20 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('invoiceNumber')}>
                                <div className="flex items-center">Ref {getSortIcon('invoiceNumber')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('customer')}>
                                <div className="flex items-center">Cliente {getSortIcon('customer')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest text-center">
                                Operador
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('status')}>
                                <div className="flex items-center justify-center">Estado {getSortIcon('status')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('total')}>
                                <div className="flex items-center justify-end">Total {getSortIcon('total')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('balance')}>
                                <div className="flex items-center justify-end">Deuda {getSortIcon('balance')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-muted uppercase tracking-widest text-center">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {processedSales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted">
                                    <div className="flex flex-col items-center gap-3">
                                        <Filter className="w-8 h-8 opacity-20" />
                                        <p className="font-medium">No se encontraron ventas</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedSales.map((sale) => (
                                <tr
                                    key={sale.id}
                                    onClick={() => router.push(`/sales/${sale.id}`)}
                                    className={cn(
                                        "group transition-all cursor-pointer border-b border-transparent",
                                        selectedIds.includes(sale.id)
                                            ? "bg-blue-50/80 dark:bg-blue-500/10 hover:bg-blue-100/50 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 shadow-sm relative z-10"
                                            : "hover:bg-slate-50 dark:hover:bg-white/5 border-slate-50 dark:border-white/5"
                                    )}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(sale.id)}
                                            onChange={() => toggleSelect(sale.id)}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-blue-600 dark:bg-black/20 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 relative">
                                        <div className="font-black text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                            {sale.invoiceNumber ? <HighlightText text={sale.invoiceNumber} highlight={currentSearch} /> : <span className="text-muted italic text-xs">Sin Ref</span>}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-muted mt-0.5 flex flex-col">
                                            <span>{format(new Date(sale.date), "dd/MM/yyyy", { locale: es })}</span>
                                            <span className="text-slate-300 dark:text-slate-600 font-normal">{format(new Date(sale.date), "hh:mm a", { locale: es })}</span>
                                        </div>
                                        {/* Products Preview (On Hover would be nicer, but inline for now) */}
                                        {sale.instances && sale.instances.length > 0 && (
                                            <div className="text-[10px] text-muted mt-1 truncate max-w-[150px]">
                                                {sale.instances.length} items: {sale.instances[0].product.name}
                                                {sale.instances.length > 1 && ` +${sale.instances.length - 1}...`}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 dark:text-white">
                                            <Link href={`/directory/customers/${sale.customer.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-400 decoration-2 transition-colors">
                                                <HighlightText text={sale.customer.name} highlight={currentSearch} />
                                            </Link>
                                        </div>
                                        <div className="text-[10px] font-bold text-muted">
                                            {sale.customer.companyName ? (
                                                <span className="flex items-center gap-1 uppercase">
                                                    <HighlightText text={sale.customer.companyName} highlight={currentSearch} />
                                                </span>
                                            ) : (
                                                `NIT/CC: ${sale.customer.taxId}`
                                            )}
                                        </div>
                                        {/* WARRANTY INDICATOR */}
                                        {(sale.instances?.some((i: any) => i.status === 'RETURNED' || i.status === 'DEFECTIVE' || i.warrantyNotes)) && (
                                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                                                <ShieldAlert className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Garantía</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="font-bold text-xs text-slate-600 dark:text-slate-400">
                                            {sale.operatorName || <span className="text-slate-300 dark:text-slate-600 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="outline" className={cn(
                                            "font-black uppercase tracking-wider text-[10px] px-2 py-1 border-0",
                                            sale.status === 'PAID' ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                                                sale.status === 'OVERDUE' ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400" :
                                                    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                        )}>
                                            {sale.status === 'PAID' ? 'Pagado' :
                                                sale.status === 'OVERDUE' ? 'Vencido' :
                                                    'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800 dark:text-white">
                                            <span className="text-xs text-muted mr-1">$</span>
                                            {new Intl.NumberFormat('es-CO').format(sale.total)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {sale.balance > 0 ? (
                                            <div className="font-black text-rose-600">
                                                <span className="text-xs text-rose-300 mr-1">$</span>
                                                {new Intl.NumberFormat('es-CO').format(sale.balance)}
                                            </div>
                                        ) : (
                                            <div className="flex justify-end text-emerald-500">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* QUICK PAY BUTTON */}
                                            {sale.balance > 0 && (
                                                <button
                                                    onClick={(e) => openSinglePayment(e, sale)}
                                                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors font-bold uppercase text-[10px] flex flex-col items-center gap-0.5"
                                                    title="Abonar a esta factura"
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    shareReceiptViaWhatsApp(sale.id);
                                                }}
                                                className="p-2 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-colors"
                                                title="Enviar Recibo por WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    printReceipt(sale.id);
                                                }}
                                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                                                title="Imprimir Factura"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={(e) => handleEdit(e, sale.id)}
                                                disabled={loadingId === sale.id}
                                                className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                                title="Editar Venta"
                                            >
                                                {loadingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSaleToDelete(sale.id);
                                                }}
                                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-1"
                                                title="Eliminar Venta"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary - Always Visible */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 rounded-b-3xl text-xs flex justify-between items-center text-muted font-medium">
                <div>
                    Mostrando {processedSales.length} ventas
                </div>
                <div className="flex gap-4">
                    <span>
                        Total Facturado: <strong className="text-slate-800 dark:text-white">${new Intl.NumberFormat('es-CO').format(processedSales.reduce((sum, s) => sum + s.total, 0))}</strong>
                    </span>
                    <span>
                        Total Pendiente: <strong className="text-rose-600 dark:text-rose-400">${new Intl.NumberFormat('es-CO').format(processedSales.reduce((sum, s) => sum + s.balance, 0))}</strong>
                    </span>
                </div>
            </div>

            {editingSale && (
                <EditSaleModal
                    onClose={() => setEditingSale(null)}
                    sale={editingSale}
                />
            )}

            <ProtectedActionModal
                isOpen={!!saleToDelete}
                onClose={() => setSaleToDelete(null)}
                onSuccess={handleDelete}
                title="Eliminar Venta"
                description="¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer y revertirá los cambios de inventario."
            />

            <ProtectedActionModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onSuccess={handleBulkDelete}
                title="Eliminar Múltiples Ventas"
                description={`¿Estás seguro de que deseas eliminar ${selectedIds.length} ventas seleccionadas? Esta acción es irreversible.`}
            />

            {/* NEW ADD PAYMENT MODAL */}
            {paymentModalState.isOpen && (
                <AddPaymentModal
                    isOpen={paymentModalState.isOpen}
                    onClose={() => setPaymentModalState({ isOpen: false })}
                    saleId={paymentModalState.saleId}
                    balance={paymentModalState.balance || 0}
                    invoiceIds={paymentModalState.bulk ? selectedIds : undefined}
                    totalDebt={paymentModalState.bulk ? totalSelectedDebt : undefined}
                    customerCredit={paymentModalState.customerCredit}
                    onSuccess={() => {
                        setPaymentModalState({ isOpen: false });
                        setSelectedIds([]);
                        router.refresh();
                    }}
                />
            )}

            <BulkDebtImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

        </div>
    );
}
