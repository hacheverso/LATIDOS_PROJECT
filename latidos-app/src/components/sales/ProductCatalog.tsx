import { useState, useEffect } from "react";
import { Package, Image as ImageIcon, Filter } from "lucide-react";
import { getAvailableProducts, getCategories } from "@/app/sales/actions";
import { cn, stringToPastelColor } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
            {/* Category Filter Dropdown */}
            <div className="sticky top-0 z-30 py-2 -mx-2 px-2 transition-all bg-slate-50/80 dark:bg-[#131517]/80 backdrop-blur-sm">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-64 h-12 bg-white dark:bg-card border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm hover:border-blue-300 transition-colors focus:ring-0">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-white">
                            <Filter className="w-4 h-4 opacity-50" />
                            <SelectValue placeholder="FILTRAR POR CATEGORÍA" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1C1E] border-slate-200 dark:border-white/10 rounded-xl shadow-xl">
                        <SelectItem value="ALL" className="font-bold text-xs uppercase cursor-pointer py-3 focus:bg-blue-50 dark:focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">
                            TODOS LOS PRODUCTOS
                        </SelectItem>
                        {categories.filter(cat => products.some(p => p.categoryRel?.id === cat.id || p.category === cat.id)).map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="font-bold text-xs uppercase cursor-pointer py-3 focus:bg-blue-50 dark:focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-20">
                {filteredProducts.map((product) => {
                    const cartItem = cart.find(i => i.product.id === product.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;
                    const stockStatus = getStockStatus(product.stockCount);

                    return (
                        <div
                            key={product.id}
                            onClick={() => product.stockCount > 0 && onProductSelect(product)}
                            className={cn(
                                "group relative flex flex-col items-center text-center bg-white dark:bg-card border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 h-full select-none",
                                stockStatus.opacity,
                                product.stockCount > 0 ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-95 active:ring-2 active:ring-blue-500/50" : "cursor-not-allowed",
                                qtyInCart > 0 ? "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 shadow-blue-100 dark:shadow-blue-900/20" : "hover:border-blue-300 dark:hover:border-blue-500/50"
                            )}
                        >
                            {/* Image Area */}
                            <div className="aspect-square bg-white border-b border-slate-100 dark:border-white/5 relative overflow-hidden w-full transition-colors flex items-center justify-center p-6">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50 rounded-xl">
                                        <ImageIcon className="w-12 h-12 md:w-16 md:h-16" />
                                    </div>
                                )}

                                {/* Stock Badge (Corner) */}
                                <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
                                    <div className={cn(
                                        "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm backdrop-blur-md",
                                        stockStatus.color
                                    )}>
                                        {product.stockCount === 0 ? "AGOTADO" : `${product.stockCount} ${stockStatus.label}`}
                                    </div>
                                </div>
                            </div>

                            {/* Info Area */}
                            <div className="p-4 flex flex-col items-center flex-1 gap-1 w-full relative">

                                {/* Category Pill */}
                                {product.categoryName && (
                                    <span
                                        className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-2"
                                        style={stringToPastelColor(product.categoryName)}
                                    >
                                        {product.categoryName}
                                    </span>
                                )}

                                {/* Product Name */}
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm leading-tight line-clamp-2 min-h-[2.5em] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight px-2">
                                    {product.name}
                                </h3>

                                {/* Price */}
                                <div className="mt-auto pt-3 w-full border-t border-slate-50/50 dark:border-white/5 flex items-baseline justify-center text-slate-900 dark:text-white">
                                    <span className="text-sm md:text-base font-bold mr-0.5">$</span>
                                    <span className="text-lg md:text-xl font-black tracking-tight">
                                        {Number(product.basePrice).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Qty Controls */}
                            {qtyInCart > 0 && (
                                <div className="absolute top-3 left-3 z-30 animate-in zoom-in-50 duration-200">
                                    <div className="bg-blue-600 text-white text-xs font-black w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ring-4 ring-white">
                                        {qtyInCart}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div >
        </div >
    );
}
