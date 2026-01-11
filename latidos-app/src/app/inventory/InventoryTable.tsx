"use client";

import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Check, ChevronUp, ChevronDown, CheckCircle, Circle, AlertOctagon } from "lucide-react";
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
    averageCost: number;
}

const PriceCell = ({ product }: { product: Product }) => {
    const [price, setPrice] = useState(product.basePrice || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Sync state if product prop updates (e.g. after revalidation)
    useEffect(() => {
        setPrice(product.basePrice || 0);
    }, [product.basePrice]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Margin Calculation (Gross Margin)
    const cost = product.averageCost || 0;
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
            const target = e.currentTarget as HTMLInputElement;
            target.blur();
            handleSave(); // Explicitly save on Enter

            // Move Focus to Next Row
            const row = target.closest('tr');
            if (row) {
                const nextRow = row.nextElementSibling;
                if (nextRow) {
                    const nextInput = nextRow.querySelector('input[type="text"]') as HTMLInputElement;
                    if (nextInput) {
                        // Small timeout to allow render/save cycle to not interfere? 
                        // Usually instant focus is fine.
                        setTimeout(() => {
                            nextInput.focus();
                            nextInput.select(); // Optional: Select text for easy overwrite
                        }, 50);
                    }
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement(10000);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleIncrement(-10000);
        }
    };

    // Alert Logic
    const isLowMargin = margin < 5;
    const isMediumMargin = margin >= 5 && margin < 15;
    const isGoodMargin = margin >= 30;

    return (
        <div
            className="relative group/price flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative flex items-center gap-2">
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                    <input
                        id={`price-input-${product.id}`}
                        type="text"
                        value={mounted ? formatNumber(price) : price}
                        onChange={handleChange}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            "w-[140px] pl-6 pr-8 py-1.5 rounded-lg border text-sm font-semibold text-slate-900 transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none tabular-nums",
                            status === 'success' ? "border-green-500 text-green-700 bg-green-50" :
                                status === 'error' ? "border-red-500 text-red-700 bg-red-50" :
                                    isDirty ? "border-blue-400 bg-blue-50/30" :
                                        "border-slate-200 bg-slate-50 focus:bg-white"
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

                    {/* Steppers - Darker Contrast */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col border-l border-slate-200 pl-1 h-full justify-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(10000); }}
                            className="text-slate-500 hover:text-blue-700 focus:text-blue-700 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(-10000); }}
                            className="text-slate-500 hover:text-blue-700 focus:text-blue-700 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Explicit Save Button - Absolute Positioned to avoid layout shift */}
                {isDirty && !isSaving && status !== 'success' && (
                    <div className="absolute left-[145px] top-1/2 -translate-y-1/2 z-10">
                        <button
                            onClick={handleSave}
                            className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm animate-in fade-in zoom-in duration-200"
                            title="Guardar Precio"
                        >
                            <Check className="w-3 h-3" />
                        </button>
                    </div>
                )}
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
    const [filters, setFilters] = useState({ category: "ALL", status: "ALL", checkPriceZero: false });
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
        if (filters.checkPriceZero) {
            items = items.filter(p => p.basePrice === 0);
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            // Smart Search: Prefix Matching? Or just Includes?
            // "AIR" should filter all names containing AIR.
            // If user types "Airpods", it finds Airpods.
            items = items.filter(p =>
                p.name.toLowerCase().includes(lowerTerm) ||
                p.sku.toLowerCase().includes(lowerTerm) ||
                p.upc.toLowerCase().includes(lowerTerm) ||
                p.category?.toLowerCase().includes(lowerTerm) // Also search in category!
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

    // Filter toggles
    const togglePriceZero = () => setFilters(prev => ({ ...prev, checkPriceZero: !prev.checkPriceZero }));
    const activeFilterCount = (filters.category !== "ALL" ? 1 : 0) + (filters.status !== "ALL" ? 1 : 0) + (filters.checkPriceZero ? 1 : 0);


    return (
        <div className="space-y-6 pb-20">
            {/* Header Actions - CLEANED */}
            <div className="flex flex-col gap-4">
                {/* Search & Main Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Expanded Search Bar */}
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por SKU, Nombre, UPC o Categoría (ej. 'AIR')..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white shadow-sm transition-all text-base font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Button & Counter */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={cn(
                                "h-14 px-6 rounded-xl border flex items-center gap-3 text-sm font-bold uppercase tracking-wide transition-all shadow-sm relative",
                                filterOpen ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-full text-[10px] ml-1",
                                    filterOpen ? "bg-white text-slate-900" : "bg-slate-900 text-white"
                                )}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Extended Filters Panel */}
                {filterOpen && (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 z-10 relative">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Categoría</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white cursor-pointer"
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            >
                                <option value="ALL">TODAS LAS CATEGORÍAS</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Estado de Stock</label>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: "ALL" }))}
                                    className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between", filters.status === 'ALL' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50")}
                                >
                                    Todos <Circle className={cn("w-3 h-3", filters.status === 'ALL' ? "fill-current" : "opacity-0")} />
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: "IN_STOCK" }))}
                                    className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between", filters.status === 'IN_STOCK' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50")}
                                >
                                    En Stock <CheckCircle className={cn("w-3 h-3", filters.status === 'IN_STOCK' ? "opacity-100" : "opacity-0")} />
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: "OUT_OF_STOCK" }))}
                                    className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between", filters.status === 'OUT_OF_STOCK' ? "bg-red-50 text-red-700" : "text-slate-500 hover:bg-slate-50")}
                                >
                                    Agotado <AlertOctagon className={cn("w-3 h-3", filters.status === 'OUT_OF_STOCK' ? "opacity-100" : "opacity-0")} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Alertas de Precio</label>
                            <button
                                onClick={togglePriceZero}
                                className={cn(
                                    "w-full p-3 rounded-xl border flex items-center gap-3 transition-all",
                                    filters.checkPriceZero
                                        ? "bg-amber-50 border-amber-200 text-amber-800 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                )}
                            >
                                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", filters.checkPriceZero ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white")}>
                                    {filters.checkPriceZero && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-sm font-bold">Sin Precio ($0)</div>
                                    <div className="text-[10px] opacity-70">Ver productos por configurar</div>
                                </div>
                            </button>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilters({ category: "ALL", status: "ALL", checkPriceZero: false }); setFilterOpen(false); }}
                                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-4"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Result Counter & Active Filters Display (Optional but nice) */}
            <div className="flex justify-between items-end px-2">
                <div className="text-sm font-medium text-slate-500">
                    Mostrando <strong className="text-slate-900">{processedProducts.length}</strong> de {initialProducts.length} productos
                </div>
            </div>

            {/* Glass Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                        <thead className="bg-slate-50/80 border-b border-slate-200/60 text-xs uppercase font-black text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 ml-1"
                                        onChange={toggleSelectAll}
                                        checked={processedProducts.length > 0 && selectedIds.size === processedProducts.length}
                                    />
                                </th>
                                <th onClick={() => handleSort("name")} className="px-6 py-4 text-left cursor-pointer hover:text-blue-600 select-none group w-[30%]">
                                    <div className="flex items-center gap-1">Producto <SortIcon columnKey="name" /></div>
                                </th>
                                <th onClick={() => handleSort("sku")} className="px-6 py-4 text-left cursor-pointer hover:text-blue-600 select-none group w-[15%]">
                                    <div className="flex items-center gap-1">SKU / UPC <SortIcon columnKey="sku" /></div>
                                </th>
                                <th onClick={() => handleSort("category")} className="px-6 py-4 text-left cursor-pointer hover:text-blue-600 select-none group w-[10%]">
                                    <div className="flex items-center gap-1">Categoría <SortIcon columnKey="category" /></div>
                                </th>
                                <th className="px-6 py-4 text-left w-[10%]">
                                    Costo Prom.
                                </th>
                                <th className="px-6 py-4 text-left w-[10%]">
                                    Precio Venta
                                </th>
                                <th className="px-6 py-4 text-right w-[8%]">
                                    MARGEN %
                                </th>
                                <th className="px-6 py-4 text-right w-[10%]">
                                    GANANCIA
                                </th>
                                <th onClick={() => handleSort("stock")} className="px-6 py-4 text-center cursor-pointer hover:text-blue-600 select-none group w-[10%]">
                                    <div className="flex items-center justify-center gap-1">Stock <SortIcon columnKey="stock" /></div>
                                </th>
                                <th className="px-6 py-4 text-right w-[8%]">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedProducts.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                <Search className="w-6 h-6" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No se encontraron productos.</p>
                                            <button onClick={() => { setSearchTerm(""); setFilters({ category: "ALL", status: "ALL", checkPriceZero: false }); }} className="text-blue-600 font-bold text-xs hover:underline">
                                                Limpiar búsqueda
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {paginatedProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    className={cn(
                                        "group hover:bg-slate-50/50 transition-all h-20", // Explicit h-16 + 1rem padding = approx h-20 for generous spacing
                                        selectedIds.has(product.id) && "bg-blue-50/30 hover:bg-blue-50/50"
                                    )}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 ml-1"
                                            checked={selectedIds.has(product.id)}
                                            onChange={() => toggleSelect(product.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/inventory/${product.id}`} className="font-bold text-slate-800 text-base hover:text-blue-600 hover:underline decoration-blue-400 line-clamp-2" onClick={(e) => e.stopPropagation()}>
                                            {product.name}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/inventory/${product.id}`} className="flex flex-col gap-1 group/sku cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <span className="font-mono text-xs font-bold text-slate-600 group-hover/sku:text-blue-600 transition-colors truncate">{product.sku}</span>
                                            {product.upc && <span className="font-mono text-[10px] text-slate-400 bg-slate-50 w-fit px-1 rounded truncate max-w-full">{product.upc}</span>}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-slate-200 px-3 hover:bg-slate-200 truncate max-w-full block text-center">
                                            {product.category}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start min-w-[80px]">
                                            <span className="text-sm font-bold text-slate-600">
                                                ${new Intl.NumberFormat('es-CO').format(product.averageCost || 0)}
                                            </span>
                                            <span className="text-[10px] text-slate-400">Costo Prom.</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <PriceCell product={product} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(() => {
                                            const price = product.basePrice || 0;
                                            const cost = product.averageCost || 0;
                                            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

                                            // Margin Color Logic
                                            let marginColor = "bg-slate-100 text-slate-500";
                                            if (margin < 5) marginColor = "bg-red-100 text-red-700";
                                            else if (margin < 15) marginColor = "bg-amber-100 text-amber-700";
                                            else if (margin >= 30) marginColor = "bg-emerald-100 text-emerald-700";

                                            return (
                                                <div className="flex justify-end">
                                                    <span className={cn("text-xs font-bold px-2 py-1 rounded", marginColor)}>
                                                        {margin.toFixed(1)}%
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(() => {
                                            const profit = (product.basePrice || 0) - (product.averageCost || 0);
                                            const isLoss = profit < 0;

                                            return (
                                                <div className="flex flex-col items-end min-w-[80px]">
                                                    <span className={cn("font-black text-sm", isLoss ? "text-red-500" : "text-emerald-600")}>
                                                        ${new Intl.NumberFormat('es-CO').format(profit)}
                                                    </span>
                                                    {isLoss && <span className="text-[10px] text-red-400 font-bold">PERDIDA</span>}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge className={cn(
                                            "font-bold px-3 py-1 whitespace-nowrap",
                                            (product.stock || 0) > 5 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                                                (product.stock || 0) > 0 ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                                    "bg-red-100 text-red-700 hover:bg-red-200"
                                        )}>
                                            {(product.stock || 0) === 0 ? "AGOTADO" : `${product.stock} UNID.`}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
                                            <DeleteProductButton productId={product.id} productName={product.name} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-slate-50 border-t border-slate-200 p-4">
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
