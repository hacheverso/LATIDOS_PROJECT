"use client"; //

import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Check, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import DeleteProductButton from "@/components/DeleteProductButton";
import BulkActionsBar from "@/components/inventory/BulkActionsBar";
import { bulkDeleteProducts, updateProductPrice } from "./actions";
import { createPortal } from "react-dom";
import { Pagination } from "@/components/ui/Pagination";


interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    // Calculated fields from DB
    stock?: number;
    status?: string;
    upc: string;
    basePrice: number;
    lastCost: number;
}

const PriceCell = ({ product }: { product: Product }) => {
    const [price, setPrice] = useState(product.basePrice || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Sync state if product prop updates (e.g. after revalidation)
    useEffect(() => {
        setPrice(product.basePrice || 0);
    }, [product.basePrice]);

    // Margin Calculation (Gross Margin)
    const cost = product.lastCost || 0;
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const profit = price - cost;
    const isDirty = price !== product.basePrice;

    // Formatting helper
    const formatNumber = (num: number) => new Intl.NumberFormat('es-CO').format(num);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove dots and non-numeric chars
        const rawValue = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
        const numValue = rawValue === "" ? 0 : parseInt(rawValue, 10);
        setPrice(numValue);
    };

    const handleIncrement = (amount: number) => {
        setPrice(prev => Math.max(0, prev + amount));
    };

    const handleSave = async () => {
        if (!isDirty) return;

        setIsSaving(true);
        setStatus('idle');

        const res = await updateProductPrice(product.id, price);

        setIsSaving(false);
        if (res.success) {
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } else {
            setStatus('error');
            alert(res.error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
            handleSave(); // Explicitly save on Enter
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement(10000);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleIncrement(-10000);
        }
    };

    return (
        <div className="relative group/price">
            <div className="relative flex items-center gap-2">
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                    <input
                        type="text"
                        value={formatNumber(price)}
                        onChange={handleChange}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            "w-40 pl-6 pr-12 py-1.5 rounded-lg border text-sm font-bold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none tabular-nums",
                            status === 'success' ? "border-green-500 text-green-700 bg-green-50" :
                                status === 'error' ? "border-red-500 text-red-700 bg-red-50" :
                                    isDirty ? "border-blue-400 bg-blue-50/30" :
                                        "border-slate-200 text-slate-700 bg-slate-50 focus:bg-white"
                        )}
                        placeholder="0"
                    />

                    {/* Status Icons */}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : status === 'success' ? (
                            <Check className="w-3 h-3 text-green-600 animate-in zoom-in" />
                        ) : null}
                    </div>

                    {/* Custom Spinners */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col border-l border-slate-200 pl-1 h-full justify-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(10000); }}
                            className="text-slate-400 hover:text-blue-600 focus:text-blue-600 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(-10000); }}
                            className="text-slate-400 hover:text-blue-600 focus:text-blue-600 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Explicit Save Button */}
                {isDirty && !isSaving && status !== 'success' && (
                    <button
                        onClick={handleSave}
                        className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm animate-in fade-in zoom-in duration-200"
                        title="Guardar Precio"
                    >
                        <Check className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Margin Tooltip / Indicator */}
            <div className="mt-1 text-[10px] font-medium flex items-center gap-1 opacity-0 group-hover/price:opacity-100 transition-opacity absolute -bottom-5 left-0 whitespace-nowrap bg-slate-800 text-white px-2 py-0.5 rounded shadow-lg z-10 pointer-events-none">
                <span className={margin < 15 ? "text-red-300" : margin < 30 ? "text-amber-300" : "text-green-300"}>
                    {margin.toFixed(0)}%
                </span>
                <span className="text-slate-400">|</span>
                <span>Ganancia: ${profit.toLocaleString()}</span>
            </div>
        </div>
    );
};

interface InventoryTableProps {
    initialProducts: Product[];
    allCategories: string[];
}

export default function InventoryTable({ initialProducts, allCategories }: InventoryTableProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ category: "ALL", status: "ALL" });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    // Clear selection and reset page when filters/search change
    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [searchTerm, filters]);

    // Filter & Sort Logic
    const processedProducts = useMemo(() => {
        let items = [...initialProducts];

        // 1. Filter
        if (filters.category !== "ALL") {
            items = items.filter(p => p.category === filters.category);
        }
        if (filters.status !== "ALL") {
            if (filters.status === "IN_STOCK") items = items.filter(p => (p.stock || 0) > 0);
            if (filters.status === "OUT_OF_STOCK") items = items.filter(p => (p.stock || 0) === 0);
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            items = items.filter(p =>
                p.name.toLowerCase().includes(lowerTerm) ||
                p.sku.toLowerCase().includes(lowerTerm) ||
                p.upc.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Sort
        if (sortConfig) {
            items.sort((a, b) => {
                const key = sortConfig.key;
                // @ts-expect-error
                const valA = a[key] ?? "";
                // @ts-expect-error
                const valB = b[key] ?? "";

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
    }, [searchTerm, filters, sortConfig, initialProducts]);

    // Pagination Logic
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedProducts.slice(start, start + itemsPerPage);
    }, [processedProducts, currentPage, itemsPerPage]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-50 transition-all" />;
        return sortConfig.direction === "asc"
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600 transition-all" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-600 transition-all" />;
    };

    const toggleSelectAll = () => {
        // Toggle only visible page or all? Usually visible page is safer for UX, but "Delete All" implies all.
        // Let's stick to current behavior (all processed) OR switch to current page.
        // Given bulk delete warning says "Eliminar X productos", selecting ALL filtered seems more powerful.
        // Let's keep it as selecting ALL MATCHING items (processedProducts).
        if (selectedIds.size === processedProducts.length && processedProducts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedProducts.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            const ids = Array.from(selectedIds);
            const result = await bulkDeleteProducts(ids);
            if (!result.success) {
                alert(result.error);
            } else {
                setSelectedIds(new Set());
            }
        } catch (_e) {
            alert("Error al eliminar productos.");
        } finally {
            setIsBulkDeleting(false);
            setShowBulkConfirm(false);
        }
    };

    const [showBulkMove, setShowBulkMove] = useState(false);
    const [targetCategory, setTargetCategory] = useState("");

    const handleBulkMove = async () => {
        if (!targetCategory) return;
        setIsBulkDeleting(true);
        try {
            const { bulkMoveProducts } = await import("./actions");
            await bulkMoveProducts(Array.from(selectedIds), targetCategory);

            setSelectedIds(new Set());
            setShowBulkMove(false);
            setTargetCategory("");
            router.refresh();
        } catch (e) {
            alert("Error al mover productos: " + String(e));
        } finally {
            setIsBulkDeleting(false);
        }
    };



    return (
        <div className="space-y-6 pb-20">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
                    <input
                        type="text"
                        placeholder="BUSCAR POR SKU, NOMBRE, UPC..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/50 backdrop-blur-sm transition-all text-sm font-bold text-slate-700 placeholder:font-normal"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={cn(
                            "px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-all",
                            filterOpen ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <Link
                        href="/inventory/purchases"
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
                    >
                        Historial
                    </Link>
                    <Link
                        href="/inventory/inbound"
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
                    >
                        Recepción de Compra
                    </Link>
                    <Link
                        href="/inventory/new"
                        className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wide flex-1 md:flex-none justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Producto
                    </Link>
                </div>
            </div>

            {/* Filter Panel */}
            {filterOpen && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Categoría</label>
                        <select
                            className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        >
                            <option value="ALL">TODAS</option>
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Estado</label>
                        <select
                            className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="ALL">TODOS</option>
                            <option value="IN_STOCK">EN STOCK</option>
                            <option value="OUT_OF_STOCK">AGOTADO</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Glass Table */}
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                        onChange={toggleSelectAll}
                                        checked={processedProducts.length > 0 && selectedIds.size === processedProducts.length}
                                    />
                                </th>
                                <th onClick={() => handleSort("name")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">Producto <SortIcon columnKey="name" /></div>
                                </th>
                                <th onClick={() => handleSort("sku")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">SKU / UPC <SortIcon columnKey="sku" /></div>
                                </th>
                                <th onClick={() => handleSort("category")} className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center gap-1">Categoría <SortIcon columnKey="category" /></div>
                                </th>
                                <th className="px-6 py-4 text-left font-black text-slate-600 uppercase text-xs tracking-wider">
                                    Precio Venta
                                </th>
                                <th onClick={() => handleSort("stock")} className="px-6 py-4 text-center font-black text-slate-600 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 select-none group">
                                    <div className="flex items-center justify-center gap-1">Stock <SortIcon columnKey="stock" /></div>
                                </th>
                                <th className="px-6 py-4 text-right font-black text-slate-600 uppercase text-xs tracking-wider">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            )}
                            {paginatedProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    onClick={() => router.push(`/inventory/${product.id}`)}
                                    className={cn(
                                        "group hover:bg-white/80 transition-all cursor-pointer",
                                        selectedIds.has(product.id) && "bg-blue-50/50 hover:bg-blue-50"
                                    )}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                            checked={selectedIds.has(product.id)}
                                            onChange={() => toggleSelect(product.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{product.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold text-slate-500">{product.sku}</span>
                                            <span className="font-mono text-[10px] text-slate-400">{product.upc}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-slate-200">
                                            {product.category}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <PriceCell product={product} />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge className={cn(
                                            "font-bold",
                                            (product.stock || 0) > 5 ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                (product.stock || 0) > 0 ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                                    "bg-red-100 text-red-700 hover:bg-red-200"
                                        )}>
                                            {(product.stock || 0) === 0 ? "AGOTADO" : `${product.stock} UNID.`}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                        <span className="text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">VER DETALLE &rarr;</span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <DeleteProductButton productId={product.id} productName={product.name} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-slate-50/50 border-t border-slate-200/60 p-2">
                    <Pagination
                        totalItems={processedProducts.length}
                        itemsPerPage={itemsPerPage}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                        pageSizeOptions={[10, 25, 50, 100, 200]}
                    />
                </div>
            </div>

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                onDelete={() => setShowBulkConfirm(true)}
                isDeleting={isBulkDeleting}
            >
                <button
                    onClick={() => setShowBulkMove(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    Mover a Categoría
                </button>
            </BulkActionsBar>

            {showBulkConfirm && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowBulkConfirm(false)}
                    />
                    <div className="relative bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar {selectedIds.size} productos?</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Esta acción borrará permanentemente todos sus registros y existencias del inventario.
                            <br />
                            <span className="font-bold text-red-600 mt-2 block">¡No hay vuelta atrás!</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowBulkConfirm(false)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                            >
                                {isBulkDeleting ? "Eliminando..." : "Sí, Eliminar Todo"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showBulkMove && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowBulkMove(false)}
                    />
                    <div className="relative bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Mover {selectedIds.size} productos</h3>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoría Destino</label>
                            <select
                                value={targetCategory}
                                onChange={e => setTargetCategory(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                            >
                                <option value="">-- SELECCIONAR --</option>
                                {allCategories.filter(c => c !== "ALL").map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowBulkMove(false)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkMove}
                                disabled={isBulkDeleting || !targetCategory}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                            >
                                {isBulkDeleting ? "Moviendo..." : "Confirmar Movimiento"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
