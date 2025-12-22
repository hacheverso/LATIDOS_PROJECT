"use client";

import { Trash2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { deleteProduct } from "@/app/inventory/actions";
import { useRouter } from "next/navigation";

interface DeleteProductButtonProps {
    productId: string;
    productName: string;
    redirectToInventory?: boolean; // If true (Detail Page), redirects after delete. If false (List), just refreshes.
}

export default function DeleteProductButton({ productId, productName, redirectToInventory = false }: DeleteProductButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false); // To prevent hydration mismatch with portal
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteProduct(productId);
            setOpen(false);
            if (redirectToInventory) {
                router.push("/inventory");
            }
        } catch (error) {
            alert("Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Eliminar Producto"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Modal Overlay Component - Portalled */}
            {open && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 transform animate-in zoom-in-95 duration-200 border border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                ¿Eliminar Producto?
                            </h3>

                            <p className="text-sm text-slate-500 font-medium">
                                Estás a punto de eliminar <span className="text-slate-800 font-bold">{productName}</span> de LATIDOS. Esta acción no se puede deshacer.
                            </p>

                            <div className="flex gap-3 w-full pt-4">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wide hover:bg-slate-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold uppercase text-xs tracking-wide hover:bg-red-700 shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    {loading ? "Eliminando..." : "Sí, Eliminar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
