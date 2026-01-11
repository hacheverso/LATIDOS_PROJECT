"use client";

import { X, Sparkles } from "lucide-react";
import ProductForm from "../../../components/inventory/ProductForm";
// Ensure relative path is correct. 
// Current file: src/app/inventory/components/QuickCreateProductModal.tsx
// Target file: src/components/inventory/ProductForm.tsx
// Path: ../../../components/inventory/ProductForm.tsx (Up to app, up to src, down to components)
// Correct.

interface QuickCreateProductModalProps {
    onClose: () => void;
    onSuccess: (newProduct: any) => void;
    prefilledUpc: string;
}

export default function QuickCreateProductModal({ onClose, onSuccess, prefilledUpc }: QuickCreateProductModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-xl">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            Crear Nuevo Producto
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                            Vinculación Rápida
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 -mr-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 hover:scale-110 transition-all border border-slate-200 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/20"
                        title="Cerrar (ESC)"
                    >
                        <X className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-8 space-y-6 bg-white relative">
                    <ProductForm
                        onSuccess={onSuccess}
                        onCancel={onClose}
                        isModal={true}
                        prefilledUpc={prefilledUpc}
                    />
                </div>
            </div>
        </div>
    );
}
