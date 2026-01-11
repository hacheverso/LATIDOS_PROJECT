"use client";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, DollarSign, Wallet, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSaleById, deleteSale, bulkDeleteSales } from "./actions";
import EditSaleModal from "./components/EditSaleModal";
import AddPaymentModal from "@/components/sales/AddPaymentModal"; // UNIFIED MODAL
import ProtectedActionModal from "./components/ProtectedActionModal";
import { Edit, Loader2, Trash2, X, ShieldAlert } from "lucide-react";

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
    };
    invoiceNumber?: string;
    dueDate?: string; // ISO String from JSON serialization
    instances?: { product: { name: string } }[];
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
        const selectedItems = processedSales.filter(s => selectedIds.includes(s.id));
        const totalDebt = selectedItems.reduce((acc, s) => acc + s.balance, 0);
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


    const handleEdit = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setLoadingId(id);
        const sale = await getSaleById(id);
        setEditingSale(sale);
        setLoadingId(null);
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
    const selectedCustomers = new Set(processedSales.filter(s => selectedIds.includes(s.id)).map(s => s.customer.id));
    const allSameCustomer = selectedCustomers.size === 1;
    const hasDebt = processedSales.some(s => selectedIds.includes(s.id) && s.balance > 0);


    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-210px)] relative">

            {/* Header / Toolbar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white pl-6 pr-2 py-2 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[90%] md:w-auto border border-white/10 ring-1 ring-black/50">
                    <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-4 mr-auto md:mr-0">
                        <span className="font-bold text-sm text-white">
                            {selectedIds.length} seleccionados
                        </span>
                        <span className="text-xs text-slate-400 font-medium hidden md:inline">|</span>
                        <span className="text-xs text-slate-300">
                            Total: <strong className="text-emerald-400 text-sm">${new Intl.NumberFormat('es-CO').format(processedSales.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.total, 0))}</strong>
                        </span>
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                        <button
                            onClick={openBulkPayment}
                            disabled={!allSameCustomer || !hasDebt}
                            className={cn(
                                "flex items-center gap-2 text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95",
                                allSameCustomer && hasDebt
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-900/30"
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            )}
                            title={!allSameCustomer ? "Solo se puede abonar a facturas del mismo cliente" : !hasDebt ? "Las facturas seleccionadas no tienen deuda" : "Abonar a seleccionados"}
                        >
                            <Wallet className="w-4 h-4" />
                            <span className="hidden md:inline">Abonar</span>
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
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === processedSales.length && processedSales.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('invoiceNumber')}>
                                <div className="flex items-center">Ref {getSortIcon('invoiceNumber')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('customer')}>
                                <div className="flex items-center">Cliente {getSortIcon('customer')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                                <div className="flex items-center justify-center">Estado {getSortIcon('status')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('total')}>
                                <div className="flex items-center justify-end">Total {getSortIcon('total')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('balance')}>
                                <div className="flex items-center justify-end">Deuda {getSortIcon('balance')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {processedSales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
                                    onClick={() => toggleSelect(sale.id)}
                                    className={cn(
                                        "group transition-all cursor-pointer border-b border-transparent",
                                        selectedIds.includes(sale.id)
                                            ? "bg-blue-50/80 hover:bg-blue-100/50 border-blue-200 shadow-sm relative z-10"
                                            : "hover:bg-slate-50 border-slate-50"
                                    )}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(sale.id)}
                                            onChange={() => toggleSelect(sale.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 relative">
                                        <div className="font-black text-slate-700 group-hover:text-blue-700 transition-colors">
                                            {sale.invoiceNumber ? <HighlightText text={sale.invoiceNumber} highlight={currentSearch} /> : <span className="text-slate-400 italic text-xs">Sin Ref</span>}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                                            {new Date(sale.date).toLocaleDateString()}
                                        </div>
                                        {/* Products Preview (On Hover would be nicer, but inline for now) */}
                                        {sale.instances && sale.instances.length > 0 && (
                                            <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">
                                                {sale.instances.length} items: {sale.instances[0].product.name}
                                                {sale.instances.length > 1 && ` +${sale.instances.length - 1}...`}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700">
                                            <HighlightText text={sale.customer.name} highlight={currentSearch} />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400">
                                            NIT/CC: {sale.customer.taxId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="outline" className={cn(
                                            "font-black uppercase tracking-wider text-[10px] px-2 py-1 border-0",
                                            sale.status === 'PAID' ? "bg-emerald-100 text-emerald-700" :
                                                sale.status === 'PARTIAL' ? "bg-amber-100 text-amber-700" :
                                                    "bg-rose-100 text-rose-700"
                                        )}>
                                            {sale.status === 'PAID' ? 'Pagado' :
                                                sale.status === 'PARTIAL' ? 'Parcial' :
                                                    'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800">
                                            <span className="text-xs text-slate-400 mr-1">$</span>
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
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl text-xs flex justify-between items-center text-slate-500 font-medium">
                <div>
                    Mostrando {processedSales.length} ventas
                </div>
                <div className="flex gap-4">
                    <span>
                        Total Facturado: <strong className="text-slate-800">${new Intl.NumberFormat('es-CO').format(processedSales.reduce((sum, s) => sum + s.total, 0))}</strong>
                    </span>
                    <span>
                        Total Pendiente: <strong className="text-rose-600">${new Intl.NumberFormat('es-CO').format(processedSales.reduce((sum, s) => sum + s.balance, 0))}</strong>
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
                    totalDebt={paymentModalState.bulk ? processedSales.filter(s => selectedIds.includes(s.id)).reduce((a, b) => a + b.balance, 0) : undefined}
                    customerCredit={paymentModalState.customerCredit}
                    onSuccess={() => {
                        setPaymentModalState({ isOpen: false });
                        setSelectedIds([]);
                        router.refresh();
                    }}
                />
            )}

        </div>
    );
}
