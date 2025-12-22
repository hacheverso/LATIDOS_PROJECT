/* eslint-disable */
import { useState, useEffect } from "react";
import { Package, Image as ImageIcon } from "lucide-react";
import { getAvailableProducts } from "@/app/sales/actions";

interface ProductCatalogProps {
    onProductSelect: (product: any) => void;
}

export function ProductCatalog({ onProductSelect }: ProductCatalogProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAvailableProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-100 rounded-2xl"></div>
                ))}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
                <button
                    key={product.id}
                    onClick={() => onProductSelect(product)}
                    className="group relative flex flex-col bg-white border border-slate-100 hover:border-blue-400 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 text-left h-full"
                >
                    {/* Image Area */}
                    <div className="aspect-square bg-slate-50 relative overflow-hidden">
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                <ImageIcon className="w-12 h-12" />
                            </div>
                        )}

                        {/* Stock Badge */}
                        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                            {product.stockCount} Disp.
                        </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-4 flex flex-col flex-1 gap-1">
                        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider truncate">
                            {product.brand}
                        </p>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {product.name}
                        </h3>
                        <div className="mt-auto pt-2 flex items-baseline gap-1">
                            <span className="text-sm font-mono text-slate-400">$</span>
                            <span className="text-lg font-black text-slate-900">
                                {Number(product.basePrice).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Force Selection Overlay - optional visual queue */}
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
                </button>
            ))}
        </div>
    );
}
