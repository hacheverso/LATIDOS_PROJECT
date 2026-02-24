"use client";

import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Check, Circle, AlertOctagon, Package, Columns, Edit3, Save, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import DeleteProductButton from "@/components/DeleteProductButton";
import BulkActionsBar from "@/components/inventory/BulkActionsBar";
import { deleteProduct, bulkDeleteProducts, bulkMoveProducts, bulkUpdatePrices } from "./actions";
import { toast } from "sonner";
import { PriceCell, Product } from "./components/PriceCell";
import { createPortal } from "react-dom";
import { Pagination } from "@/components/ui/Pagination";

interface InventoryTableProps {
    initialProducts: Product[];
    allCategories: string[];
    totalCount?: number;
    outOfStockCount?: number;
    showAllStock?: boolean;
}

export default function InventoryTable({ initialProducts, allCategories, totalCount = 0, outOfStockCount = 0, showAllStock = false }: InventoryTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ category: "ALL", status: "ALL", checkPriceZero: false });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Pagination State (Synced with URL)
    const currentPage = Number(searchParams.get('page')) || 1;
    const [itemsPerPage, setItemsPerPage] = useState(50); // Hardcoded matching the server side take for now

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleToggleStock = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (showAllStock) {
            params.delete('stock'); // Revert to default (Only In Stock)
        } else {
            params.set('stock', 'all');
        }
        params.set('page', '1'); // Reset pagination on filter change
        router.push(`${pathname}?${params.toString()}`);
    };

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    // Column Visibility State
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<{ upc: boolean; sku: boolean; category: boolean; cost: boolean; margin: boolean; profit: boolean; }>({
        upc: true,
        sku: true,
        category: true,
        cost: true,
        margin: true,
        profit: true
    });

    // Mass Price Editing State
    const [isEditMode, setIsEditMode] = useState(false);
    const [modifiedPrices, setModifiedPrices] = useState<Record<string, number>>({});
    const [isSavingPrices, setIsSavingPrices] = useState(false);

    // Save modified price to local state
    const handlePriceChange = (id: string, newPriceText: string) => {
        const cleanVal = newPriceText.replace(/\D/g, "");
        const newPrice = Number(cleanVal);
        setModifiedPrices(prev => ({
            ...prev,
            [id]: newPrice
        }));
    };

    const handleSavePrices = async () => {
        if (Object.keys(modifiedPrices).length === 0) return;
        setIsSavingPrices(true);
        const toastId = toast.loading("Guardando precios...");

        try {
            const res = await bulkUpdatePrices(modifiedPrices);
            if (res.success) {
                toast.success(`Se actualizaron ${Object.keys(modifiedPrices).length} precios correctamente.`, { id: toastId });
                setIsEditMode(false);
                setModifiedPrices({});
                router.refresh(); // Trigger a refetch
            } else {
                toast.error(res.error || "Error al actualizar precios", { id: toastId });
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado al guardar.", { id: toastId });
        } finally {
            setIsSavingPrices(false);
        }
    };

    // Load from LocalStorage on Mount
    useEffect(() => {
        const stored = localStorage.getItem('inventory_visible_columns');
        if (stored) {
            try {
                setVisibleColumns(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse visible columns", e);
            }
        }
    }, []);

    // Save to LocalStorage on Change
    useEffect(() => {
        localStorage.setItem('inventory_visible_columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const toggleColumn = (key: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Clear selection and reset page to 1 when filters/search change
    useEffect(() => {
        setSelectedIds(new Set());
        handlePageChange(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filters]);

    // Filter & Sort Logic
    const processedProducts = useMemo(() => {
        let items = [...initialProducts].map(p => {
            const livePrice = modifiedPrices[p.id] !== undefined ? modifiedPrices[p.id] : (p.basePrice || 0);
            const cost = p.averageCost || 0;
            const margin = livePrice > 0 ? ((livePrice - cost) / livePrice) * 100 : 0;
            const profit = livePrice - cost;
            const isUnsaved = modifiedPrices[p.id] !== undefined && modifiedPrices[p.id] !== p.basePrice;

            return { ...p, basePrice: livePrice, margin, profit, isUnsaved };
        });

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

    // We removed client-side slicing here because `initialProducts` is ALREADY sliced by the server.
    // However, if there's active client filtering/searching, we should fall back to client pagination
    // just for the filtered subset, or ideally dispatch search strings to the server.
    // Since we are migrating incrementally, if search/filters are active, we slice client-side,
    // otherwise we just show initialProducts.
    const isClientFiltering = Boolean(searchTerm || filters.category !== "ALL" || filters.status !== "ALL" || filters.checkPriceZero);

    const paginatedProducts = useMemo(() => {
        if (!isClientFiltering) return processedProducts;

        const start = (currentPage - 1) * itemsPerPage;
        return processedProducts.slice(start, start + itemsPerPage);
    }, [processedProducts, currentPage, itemsPerPage, isClientFiltering]);

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
        if (!targetCategory || selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        try {
            await bulkMoveProducts(Array.from(selectedIds), targetCategory);
            setSelectedIds(new Set());
            setShowBulkMove(false);
            setTargetCategory("");
            toast.success("Movidosh con exito");
        } catch (error) {
            console.error(error);
            toast.error("Error al mover productos");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // --- NEW: Barcode Scanner Auto-Scroll for Edit Mode ---
    useEffect(() => {
        if (isEditMode && searchTerm.length > 3) {
            // Check if the current searchTerm exactly matches a visible SKU or UPC
            const matchedProduct = paginatedProducts.find(
                p => (p.sku && p.sku.toUpperCase() === searchTerm.toUpperCase()) ||
                    (p.upc && p.upc.toUpperCase() === searchTerm.toUpperCase())
            );

            if (matchedProduct) {
                // Wait for render, then scroll and focus
                setTimeout(() => {
                    const row = document.getElementById(`product-row-${matchedProduct.sku}`);
                    const input = document.getElementById(`price-input-${matchedProduct.id}`);
                    if (row && input) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        input.focus();
                        // Optional: Highlight the row temporarily
                        row.classList.add('bg-blue-100/50');
                        setTimeout(() => row.classList.remove('bg-blue-100/50'), 2000);
                    }
                }, 100);
            }
        }
    }, [searchTerm, isEditMode, paginatedProducts]);

    // Filter toggles
    const togglePriceZero = () => setFilters(prev => ({ ...prev, checkPriceZero: !prev.checkPriceZero }));
    const activeFilterCount = (filters.category !== "ALL" ? 1 : 0) + (filters.status !== "ALL" ? 1 : 0) + (filters.checkPriceZero ? 1 : 0);


    // Extracted Row Component to map easily during grouping
    const ProductRow = ({ product }: { product: typeof paginatedProducts[0] }) => (
        <tr
            id={`product-row-${product.sku}`}
            className={cn(
                "group hover:bg-slate-50/50 transition-all h-12", // Reduced height
                selectedIds.has(product.id) && "bg-blue-50/30 hover:bg-blue-50/50"
            )}
        >
            <td className="px-3 py-3 sticky left-0 z-30 bg-white group-hover:bg-slate-50 transition-colors border-r border-transparent group-hover:border-slate-200/50" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                    />
                </div>
            </td>
            <td className="px-4 py-3 sticky left-[40px] z-30 bg-white group-hover:bg-slate-50 transition-colors shadow-[4px_0_24px_-2px_rgba(0,0,0,0.02)] border-r border-transparent group-hover:border-slate-200/50">
                <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                        <div className="w-9 h-9 shrink-0 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden shadow-sm">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                            <Package className="w-5 h-5" />
                        </div>
                    )}
                    <Link href={`/inventory/${product.id}`} className="font-bold text-slate-800 text-xs hover:text-blue-600 hover:underline decoration-blue-400 leading-tight" onClick={(e) => e.stopPropagation()}>
                        {product.name}
                    </Link>
                </div>
            </td>
            {visibleColumns.upc && (
                <td className="hidden md:table-cell px-4 py-3">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{product.upc || "-"}</span>
                </td>
            )}
            {visibleColumns.sku && (
                <td className="hidden md:table-cell px-4 py-3">
                    <Link href={`/inventory/${product.id}`} className="font-mono text-[10px] font-bold text-blue-600 hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                        {product.sku}
                    </Link>
                </td>
            )}
            {visibleColumns.category && (
                <td className="hidden lg:table-cell px-4 py-3">
                    <Badge variant="secondary" className="bg-slate-100 text-[10px] text-slate-600 font-bold border-slate-200 px-2 py-0.5 hover:bg-slate-200 truncate max-w-full block text-center">
                        {product.category}
                    </Badge>
                </td>
            )}
            {visibleColumns.cost && (
                <td className="hidden lg:table-cell px-4 py-3">
                    <div className="flex flex-col items-start min-w-[80px]">
                        <span className={cn(
                            "text-xs font-bold",
                            product.isLastKnownCost ? "text-slate-400 italic" : "text-slate-600"
                        )}>
                            ${new Intl.NumberFormat('es-CO').format(product.averageCost || 0)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                            {product.isLastKnownCost ? "Último Costo" : "Costo Prom."}
                        </span>
                    </div>
                </td>
            )}
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {isEditMode ? (
                    <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400 font-bold text-xs">$</span>
                        <input
                            id={`price-input-${product.id}`}
                            type="text"
                            value={new Intl.NumberFormat('es-CO').format(product.basePrice || 0)}
                            onChange={(e) => handlePriceChange(product.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className={cn(
                                "w-[120px] pl-6 pr-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                product.isUnsaved ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            )}
                        />
                    </div>
                ) : (
                    <PriceCell product={product} />
                )}
            </td>
            {visibleColumns.margin && (
                <td className="hidden xl:table-cell px-4 py-3 text-right">
                    <div className="flex justify-end">
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            (product.margin ?? 0) < 5 ? "bg-red-100 text-red-700" :
                                (product.margin ?? 0) < 15 ? "bg-amber-100 text-amber-700" :
                                    "bg-emerald-100 text-emerald-700"
                        )}>
                            {(product.margin ?? 0).toFixed(1)}%
                        </span>
                    </div>
                </td>
            )}
            {visibleColumns.profit && (
                <td className="hidden xl:table-cell px-4 py-3 text-right">
                    <div className="flex flex-col items-end min-w-[80px]">
                        <span className={cn("font-black text-xs", (product.profit ?? 0) < 0 ? "text-red-500" : "text-emerald-600")}>
                            ${new Intl.NumberFormat('es-CO').format(product.profit ?? 0)}
                        </span>
                        {(product.profit ?? 0) < 0 && <span className="text-[9px] text-red-400 font-bold">PERDIDA</span>}
                    </div>
                </td>
            )}
            <td className="px-4 py-3 text-center">
                <Badge className={cn(
                    "font-bold px-2 py-0.5 text-[10px] whitespace-nowrap",
                    (product.stock || 0) > 5 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                        (product.stock || 0) > 0 ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                            "bg-red-100 text-red-700 hover:bg-red-200"
                )}>
                    {(product.stock || 0) === 0 ? "AGOTADO" : `${product.stock} UNID.`}
                </Badge>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
                    <DeleteProductButton productId={product.id} productName={product.name} />
                </div>
            </td>
        </tr>
    );

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
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white shadow-sm transition-all text-sm font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Button & Counter */}
                    <div className="flex items-center gap-3 w-full md:w-auto">

                        {/* Price Edit Mode Toggle */}
                        {isEditMode ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setIsEditMode(false); setModifiedPrices({}); }}
                                    className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wide transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={Object.keys(modifiedPrices).length === 0 || isSavingPrices}
                                    onClick={handleSavePrices}
                                    className="h-11 px-4 rounded-xl border border-transparent bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                                >
                                    {isSavingPrices ? "Guardando..." : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Guardar ({Object.keys(modifiedPrices).length})
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 font-bold text-xs uppercase tracking-wide transition-all flex items-center gap-2"
                            >
                                <Edit3 className="w-4 h-4 text-blue-600" />
                                Modo Edición
                            </button>
                        )}

                        {/* Toggle Stock Switch */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={handleToggleStock}>
                            <button
                                type="button"
                                className={cn(
                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                                    showAllStock ? "bg-slate-300" : "bg-blue-600"
                                )}
                            >
                                <span className={cn(
                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                    showAllStock ? "translate-x-4" : "translate-x-0"
                                )} />
                            </button>
                            <span className="text-[10px] font-bold text-slate-600 leading-tight uppercase tracking-tight flex flex-col">
                                {showAllStock ? (
                                    <>
                                        Ocultar Agotados
                                    </>
                                ) : (
                                    <>
                                        Ver Agotados
                                        <span className="text-blue-600">({outOfStockCount})</span>
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Columns Button */}
                        <div className="relative">
                            <button
                                onClick={() => setColumnsOpen(!columnsOpen)}
                                className={cn(
                                    "h-11 px-4 rounded-xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-all shadow-sm",
                                    columnsOpen ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <Columns className="w-4 h-4" />
                                Columnas
                            </button>

                            {/* Columns Dropdown */}
                            {columnsOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.upc}
                                                onChange={() => toggleColumn('upc')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">UPC</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.sku}
                                                onChange={() => toggleColumn('sku')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">SKU</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.category}
                                                onChange={() => toggleColumn('category')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">Categoría</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.cost}
                                                onChange={() => toggleColumn('cost')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">Costo Prom.</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.margin}
                                                onChange={() => toggleColumn('margin')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">Margen %</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={visibleColumns.profit}
                                                onChange={() => toggleColumn('profit')}
                                            />
                                            <span className="text-xs font-bold text-slate-700">Ganancia</span>
                                        </label>
                                    </div>

                                    {/* Optional: Backdrop to close */}
                                    <div
                                        className="fixed inset-0 z-[-1]"
                                        onClick={() => setColumnsOpen(false)}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={cn(
                                "h-11 px-4 rounded-xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-all shadow-sm relative",
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

            {/* Inventory Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm min-w-[1200px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-3 py-3 w-[40px] min-w-[40px] sticky left-0 z-50 bg-slate-50/95 border-b border-slate-200">
                                    <div className="flex justify-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                                            onChange={toggleSelectAll}
                                            checked={processedProducts.length > 0 && selectedIds.size === processedProducts.length}
                                        />
                                    </div>
                                </th>
                                <th onClick={() => handleSort("name")} className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 select-none group min-w-[280px] sticky left-[40px] z-50 bg-slate-50/95 border-b border-slate-200 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-1">Producto <SortIcon columnKey="name" /></div>
                                </th>
                                {visibleColumns.upc && (
                                    <th onClick={() => handleSort("upc")} className="hidden md:table-cell px-4 py-3 text-left cursor-pointer hover:text-blue-600 select-none group min-w-[120px] border-b border-slate-200">
                                        <div className="flex items-center gap-1">UPC <SortIcon columnKey="upc" /></div>
                                    </th>
                                )}
                                {visibleColumns.sku && (
                                    <th onClick={() => handleSort("sku")} className="hidden md:table-cell px-4 py-3 text-left cursor-pointer hover:text-blue-600 select-none group min-w-[120px] border-b border-slate-200">
                                        <div className="flex items-center gap-1">SKU <SortIcon columnKey="sku" /></div>
                                    </th>
                                )}
                                {visibleColumns.category && (
                                    <th onClick={() => handleSort("category")} className="hidden lg:table-cell px-4 py-3 text-left cursor-pointer hover:text-blue-600 select-none group min-w-[120px] border-b border-slate-200">
                                        <div className="flex items-center gap-1">Categoría <SortIcon columnKey="category" /></div>
                                    </th>
                                )}
                                {visibleColumns.cost && (
                                    <th className="hidden lg:table-cell px-4 py-3 text-left min-w-[100px] border-b border-slate-200">
                                        Costo Prom.
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left min-w-[140px] border-b border-slate-200">
                                    Precio Venta
                                </th>
                                {visibleColumns.margin && (
                                    <th className="hidden xl:table-cell px-4 py-3 text-right min-w-[80px] border-b border-slate-200">
                                        MARGEN %
                                    </th>
                                )}
                                {visibleColumns.profit && (
                                    <th className="hidden xl:table-cell px-4 py-3 text-right min-w-[100px] border-b border-slate-200">
                                        GANANCIA
                                    </th>
                                )}
                                <th onClick={() => handleSort("stock")} className="px-4 py-3 text-center cursor-pointer hover:text-blue-600 select-none group min-w-[100px] border-b border-slate-200">
                                    <div className="flex items-center justify-center gap-1">Stock <SortIcon columnKey="stock" /></div>
                                </th>
                                <th className="px-4 py-3 text-right min-w-[60px] border-b border-slate-200">Acción</th>
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

                            {/* Render Logic: Grouped by Category in Edit Mode, Flat otherwise */}
                            {(() => {
                                if (!isEditMode) {
                                    return paginatedProducts.map(product => <ProductRow key={product.id} product={product} />);
                                }

                                // Group by Category
                                const grouped = paginatedProducts.reduce((acc, current) => {
                                    const cat = current.category || "SIN CATEGORÍA";
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(current);
                                    return acc;
                                }, {} as Record<string, typeof paginatedProducts>);

                                return Object.entries(grouped).map(([category, items]) => (
                                    <React.Fragment key={category}>
                                        <tr className="bg-slate-100/80">
                                            <td colSpan={10} className="px-4 py-2 font-black text-xs text-slate-600 uppercase tracking-widest border-y border-slate-200 shadow-sm sticky left-0 z-40">
                                                {category} <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full text-[10px]">{items.length}</span>
                                            </td>
                                        </tr>
                                        {items.map(product => <ProductRow key={product.id} product={product} />)}
                                    </React.Fragment>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-100 border-t border-slate-100">
                    {paginatedProducts.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            No se encontraron productos.
                        </div>
                    )}
                    {paginatedProducts.map((product) => (
                        <div key={product.id} className={cn("p-4 flex flex-col gap-3 transition-colors", selectedIds.has(product.id) ? "bg-blue-50/30" : "bg-white")}>
                            <div className="flex items-start gap-3">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        checked={selectedIds.has(product.id)}
                                        onChange={() => toggleSelect(product.id)}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div>
                                                <Link href={`/inventory/${product.id}`} className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{product.name}</Link>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="font-mono text-xs font-bold text-slate-500 uppercase">{product.sku}</span>
                                                    <span className="font-mono text-[10px] font-medium text-slate-400 bg-slate-100 px-1 rounded">UPC: {product.upc}</span>
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600">{product.category}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pl-8 mt-1 border-t border-slate-50 pt-3">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-1.5">PRECIO VENTA</p>
                                    <PriceCell product={product} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold">COSTO</p>
                                        <p className="text-xs font-bold text-slate-700">${new Intl.NumberFormat('es-CO').format(product.averageCost || 0)}</p>
                                    </div>
                                    <Badge className={cn(
                                        "font-bold px-2 py-0.5 text-[10px] mt-1 whitespace-nowrap",
                                        (product.stock || 0) > 5 ? "bg-emerald-100 text-emerald-700" :
                                            (product.stock || 0) > 0 ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                    )}>
                                        {(product.stock || 0) === 0 ? "AGOTADO" : `${product.stock} UNID.`}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                <div className="bg-slate-50 border-t border-slate-200 p-4">
                    <Pagination
                        totalItems={isClientFiltering ? processedProducts.length : totalCount}
                        itemsPerPage={itemsPerPage}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
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

            {
                showBulkConfirm && createPortal(
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
                )
            }

            {
                showBulkMove && createPortal(
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
                )
            }
        </div >
    );
}
