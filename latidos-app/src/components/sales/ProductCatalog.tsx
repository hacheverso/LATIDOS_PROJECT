import { useState, useEffect } from "react";
import { Package, Image as ImageIcon, Layers, X, Plus, Minus } from "lucide-react";
import { getAvailableProducts, getCategories } from "@/app/sales/actions";
import { cn } from "@/lib/utils";

interface ProductCatalogProps {
    onProductSelect: (product: any) => void;
    cart: any[];
    onQuickAdd: (product: any) => void;
    onQuickRemove: (product: any) => void;
}

export function ProductCatalog({ onProductSelect, cart, onQuickAdd, onQuickRemove }: ProductCatalogProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    useEffect(() => {
        Promise.all([
            getAvailableProducts(),
            getCategories()
        ]).then(([productsData, categoriesData]) => {
            setProducts(productsData);
            setCategories(categoriesData);
            setLoading(false);
        });
    }, []);

    const filteredProducts = selectedCategory === "ALL"
        ? products
        : products.filter(p => p.categoryRel?.id === selectedCategory || p.category === selectedCategory);

    // Helper to get stock status color
    const getStockStatus = (count: number) => {
        if (count === 0) return { color: "bg-slate-200 text-slate-500", label: "AGOTADO", opacity: "opacity-60 grayscale" };
        if (count < 5) return { color: "bg-red-500 text-white", label: "CRÍTICO", opacity: "" };
        if (count <= 10) return { color: "bg-amber-500 text-white", label: "BAJO", opacity: "" };
        return { color: "bg-emerald-500 text-white", label: "DISP.", opacity: "" };
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex gap-2 animate-pulse overflow-hidden">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-24 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-square bg-slate-100 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay productos disponibles para venta.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Filter Bar */}
            <div className="flex flex-wrap gap-2 sticky top-0 bg-white/80 backdrop-blur-sm z-30 py-2 -mx-2 px-2 border-b border-transparent transition-all">
                <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm",
                        selectedCategory === "ALL"
                            ? "bg-slate-900 text-white border-slate-900 shadow-slate-900/20 scale-105"
                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
                    )}
                >
                    TODOS
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm",
                            selectedCategory === cat.id
                                ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20 scale-105"
                                : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4 pb-20">
                {filteredProducts.map((product) => {
                    const cartItem = cart.find(i => i.product.id === product.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;
                    const stockStatus = getStockStatus(product.stockCount);

                    return (
                        <div
                            key={product.id}
                            className={cn(
                                "group relative flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full",
                                stockStatus.opacity,
                                qtyInCart > 0 ? "ring-2 ring-blue-500 border-blue-500 shadow-blue-100" : "hover:border-blue-400"
                            )}
                        >
                            {/* Card click actions mostly handled by specific buttons now, but keeping main area clickable for default action (add) */}
                            <button
                                onClick={() => onProductSelect(product)}
                                className="flex-1 flex flex-col text-left w-full relative"
                                disabled={product.stockCount === 0}
                            >
                                {/* Image Area */}
                                <div className="aspect-square bg-slate-50 relative overflow-hidden w-full group-hover:bg-white transition-colors">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}

                                    {/* Stock Badge - Traffic Light */}
                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                        <div className={cn(
                                            "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-sm backdrop-blur-md",
                                            stockStatus.color
                                        )}>
                                            {product.stockCount === 0 ? "AGOTADO" : `${product.stockCount} ${stockStatus.label}`}
                                        </div>
                                    </div>

                                    {/* Qty in Cart Overlay Badge - REMOVED from here, moved to floating controls */}

                                </div>

                                {/* Info Area */}
                                <div className="p-4 flex flex-col flex-1 gap-1 w-full">
                                    <div className="flex justify-between items-center w-full gap-2 mb-1">
                                        <p className="font-mono text-[9px] text-slate-400 uppercase tracking-wider truncate flex-1 hidden md:block">
                                            {product.brand}
                                        </p>
                                        {/* UPC Display - Hidden on Mobile */}
                                        {product.upc && (
                                            <span className="text-[9px] font-mono text-slate-300 hidden xl:block">
                                                {product.upc}
                                            </span>
                                        )}
                                        {product.categoryName && (
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase max-w-[100%] truncate ml-auto">
                                                {product.categoryName}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors h-[2.5em] tracking-tight">
                                        {product.name}
                                    </h3>
                                    <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-mono text-slate-400 leading-none">$</span>
                                            <span className="text-sm font-black text-slate-900 leading-none">
                                                {Number(product.basePrice).toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Quick Add Button - Inline */}
                                        {product.stockCount > 0 && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onQuickAdd(product); }}
                                                className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all group-hover:shadow-blue-500/30 cursor-pointer shrink-0"
                                                title="Agregar al carrito"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* Qty Controls (Only show if in cart) */}
                            {qtyInCart > 0 && (
                                <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                                    <div className="bg-blue-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                        {qtyInCart}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onQuickRemove(product); }}
                                        className="w-6 h-6 rounded-full bg-white text-red-500 border border-red-100 flex items-center justify-center shadow-sm hover:bg-red-50 transition-all"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                        </div>
                    );
                })}
            </div >
        </div >
    );
}
