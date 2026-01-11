"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProductForm from "@/components/inventory/ProductForm";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
    const router = useRouter();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/inventory" className="p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Nuevo Producto Maestro</h1>
                    <p className="text-slate-500 text-sm">Define el ADN del producto (Ficha Técnica)</p>
                </div>
            </div>

            {/* Unified Form */}
            <ProductForm
                onSuccess={() => {
                    // Redirect is handled by default in ProductForm if onSuccess is not provided, 
                    // but we can be explicit here or just let it handle it.
                    // The ProductForm default is router.push("/inventory").
                    // If we want to show a toast or something, we can do it here.
                    // For now, let's pass undefined to use default behavior or pass explicit redirect.
                    router.push("/inventory");
                    router.refresh();
                }}
                isModal={false}
            />
        </div>
    );
}
