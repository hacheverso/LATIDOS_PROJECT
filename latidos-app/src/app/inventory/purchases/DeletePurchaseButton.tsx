"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { deletePurchase } from "../actions";

interface DeletePurchaseButtonProps {
    purchaseId: string;
}

export function DeletePurchaseButton({ purchaseId }: DeletePurchaseButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deletePurchase(purchaseId);
            if (!result.success) {
                alert(result.error);
            }
        } catch (error) {
            alert("Ocurrió un error al eliminar.");
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Eliminar registro de compra"
            >
                <Trash2 size={18} />
            </button>

            {showConfirm && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowConfirm(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar esta compra?</h3>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Se borrarán permanentemente todas las unidades y seriales asociados de tu inventario.
                            <br />
                            <span className="font-semibold text-red-600 mt-2 block">Esta acción no se puede deshacer.</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {isDeleting ? "Eliminando..." : "Eliminar, entendido"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
