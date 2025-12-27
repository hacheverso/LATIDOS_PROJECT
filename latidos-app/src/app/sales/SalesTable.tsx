"use client";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, DollarSign, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSaleById, deleteSale } from "./actions";
import EditSaleModal from "./components/EditSaleModal";
import ProtectedActionModal from "./components/ProtectedActionModal";
import { Edit, Loader2, Trash2 } from "lucide-react";

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
    };
}

interface SalesTableProps {
    initialSales: Sale[];
}

export default function SalesTable({ initialSales }: SalesTableProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editingSale, setEditingSale] = useState<any | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

    // Debounce timer for search input
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleSearch = (term: string) => {
        setSearchTerm(term); // Update local state for input control

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const newTimeout = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            if (term) {
                params.set('search', term);
            } else {
                params.delete('search');
            }
            router.push(`?${params.toString()}`);
        }, 500); // Debounce for 500ms
        setSearchTimeout(newTimeout);
    };

    const handleEdit = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        setLoadingId(id);
        try {
            const sale = await getSaleById(id);
            setEditingSale(sale);
        } catch (error) {
            console.error(error);
            alert("Error al cargar la venta");
        } finally {
            setLoadingId(null);
        }
    };

    // Filter & Sort Logic
    const processedSales = useMemo(() => {
        let items = [...initialSales];

        // 1. Filter by Text (Now handled Server-Side, so we skip local filtering if server did it)
        // However, initialSales IS the filtered result from server.
        // So we don't need to filter by text here anymore!

        // 2. Filter by Status
        if (statusFilter !== "ALL") {
            items = items.filter(s => s.status === statusFilter);
        }

        // 3. Sort
        if (sortConfig) {
            items.sort((a, b) => {
                const key = sortConfig.key;
                let valA: any = a[key as keyof Sale];
                let valB: any = b[key as keyof Sale];

                if (key === 'customer') {
                    // Safety check for customer
                    valA = a.customer?.name || '';
                    valB = b.customer?.name || '';
                }

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === "asc" ? valA - valB : valB - valA;
                }

                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();

                if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
                if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [initialSales, statusFilter, sortConfig]);

    // Financial Metrics Calculation (Dynamic based on filtered view)
    const metrics = useMemo(() => {
        return processedSales.reduce((acc, sale) => ({
            billed: acc.billed + sale.total,
            collected: acc.collected + sale.amountPaid,
            pending: acc.pending + sale.balance
        }), { billed: 0, collected: 0, pending: 0 });
    }, [processedSales]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "desc" };
        });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-50 transition-all" />;
        return sortConfig.direction === "asc"
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600 transition-all" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-600 transition-all" />;
    };

    return (
        <div className="space-y-8">
            {/* Financial Metrics Cards (Dynamic) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Facturado */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Total Facturado</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 tracking-tight">
                            ${metrics.billed.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-1">
                            {processedSales.length} transacciones
                        </div>
                    </div>
                </div>

                {/* Card 2: Recaudado */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-green-600/70">
                            <Wallet className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Recaudado (Efectivo)</span>
                        </div>
                        <div className="text-3xl font-black text-green-700 tracking-tight">
                            ${metrics.collected.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600/60 font-medium mt-1">
                            Ingresos reales
                        </div>
                    </div>
                </div>

                {/* Card 3: Pendiente */}
                <div className={cn(
                    "p-6 rounded-2xl shadow-sm border flex flex-col justify-between relative overflow-hidden group transition-all",
                    metrics.pending > 0 ? "bg-orange-50/50 border-orange-100" : "bg-white border-slate-100"
                )}>
                    {metrics.pending > 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />}

                    <div className="relative z-10">
                        <div className={cn("flex items-center gap-2 mb-2", metrics.pending > 0 ? "text-orange-600/70" : "text-slate-400")}>
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Saldo Pendiente (CXC)</span>
                        </div>
                        <div className={cn("text-3xl font-black tracking-tight", metrics.pending > 0 ? "text-orange-700" : "text-slate-300")}>
                            ${metrics.pending.toLocaleString()}
                        </div>
                        <div className={cn("text-xs font-medium mt-1", metrics.pending > 0 ? "text-orange-600/60" : "text-slate-400")}>
                            Por cobrar
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
                        <input
                            type="text"
                            placeholder="BUSCAR CLIENTE, NI T, ID..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm transition-all text-sm font-bold text-slate-700 placeholder:font-normal"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Date Range Filter */}
                    <div className="relative group">
                        <select
                            onChange={(e) => {
                                const val = e.target.value;
                                const params = new URLSearchParams(window.location.search);
                                const now = new Date();

                                if (val === 'ALL') {
                                    params.delete('startDate');
                                    params.delete('endDate');
                                } else if (val === 'THIS_MONTH') {
                                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                    params.set('startDate', start.toISOString());
                                    params.set('endDate', end.toISOString());
                                } else if (val === 'LAST_MONTH') {
                                    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    const end = new Date(now.getFullYear(), now.getMonth(), 0);
                                    params.set('startDate', start.toISOString());
                                    params.set('endDate', end.toISOString());
                                }

                                router.push(`?${params.toString()}`);
                            }}
                            className="pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm appearance-none cursor-pointer hover:bg-slate-50 transition-all text-sm font-bold text-slate-700"
                            defaultValue="ALL"
                        >
                            <option value="ALL">Todo el Historial</option>
                            <option value="THIS_MONTH">Este Mes</option>
                            <option value="LAST_MONTH">Mes Anterior</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative group">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm appearance-none cursor-pointer hover:bg-slate-50 transition-all text-sm font-bold text-slate-700"
                        >
                            <option value="ALL">TODOS</option>
                            <option value="PAID">PAGADO (SALDADO)</option>
                            <option value="PARTIAL">PARCIAL (ABONADO)</option>
                            <option value="PENDING">PENDIENTE (DEUDA)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Link
                        href="/sales/new"
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wide flex-1 md:flex-none justify-center"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Nueva Venta
                    </Link>
                </div>
            </div>

            {/* Glass Table */}
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/60">
                            <tr>
                                <th onClick={() => handleSort("date")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">Fecha <SortIcon columnKey="date" /></div>
                                </th>
                                <th onClick={() => handleSort("id")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">ID Venta <SortIcon columnKey="id" /></div>
                                </th>
                                <th onClick={() => handleSort("customer")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">Cliente <SortIcon columnKey="customer" /></div>
                                </th>
                                <th onClick={() => handleSort("total")} className="px-6 py-4 text-right font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center justify-end gap-1">Total <SortIcon columnKey="total" /></div>
                                </th>
                                <th onClick={() => handleSort("amountPaid")} className="px-6 py-4 text-right font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center justify-end gap-1">Pagado <SortIcon columnKey="amountPaid" /></div>
                                </th>
                                <th onClick={() => handleSort("balance")} className="px-6 py-4 text-right font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center justify-end gap-1">Pendiente <SortIcon columnKey="balance" /></div>
                                </th>
                                <th className="px-6 py-4 text-center font-black text-slate-600 uppercase text-xs tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedSales.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                                        No se encontraron ventas que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                            {processedSales.map((sale) => (
                                <tr
                                    key={sale.id}
                                    onClick={() => router.push(`/sales/${sale.id}`)}
                                    className="group hover:bg-white/80 transition-all cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700">
                                            {new Date(sale.date).toLocaleDateString('es-CO')}
                                            <span className="block text-[10px] text-slate-400 font-mono">
                                                {new Date(sale.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            {sale.id.slice(0, 8).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{sale.customer?.name}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{sale.customer?.taxId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800">
                                            ${sale.total.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">
                                            {sale.itemCount} items
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-green-700">
                                            ${sale.amountPaid.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 uppercase">
                                            {sale.paymentMethod}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {sale.balance <= 0 ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Saldado
                                            </Badge>
                                        ) : (
                                            <div className="font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg inline-block text-right">
                                                ${sale.balance.toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {
                editingSale && (
                    <EditSaleModal
                        sale={editingSale}
                        onClose={() => {
                            setEditingSale(null);
                            router.refresh(); // Refresh list to show updates
                        }}
                    />
                )
            }

            <ProtectedActionModal
                isOpen={!!saleToDelete}
                onClose={() => setSaleToDelete(null)}
                title="Eliminar Factura"
                description="Se revertirá el inventario y se eliminará el registro financiero."
                onSuccess={async (admin) => {
                    if (saleToDelete) {
                        try {
                            await deleteSale(saleToDelete);
                            // Refresh logic
                            router.refresh();
                        } catch (e) {
                            alert("Error al eliminar: " + (e as Error).message);
                        } finally {
                            setSaleToDelete(null);
                        }
                    }
                }}
            />
        </div >
    );
}
