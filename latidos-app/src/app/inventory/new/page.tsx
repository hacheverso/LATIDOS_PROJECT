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
                <Link href="/inventory" className="p-2 rounded-full hover:bg-card text-primary0 hover:text-primary transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-primary uppercase tracking-tight">Nuevo Producto Maestro</h1>
                    <p className="text-primary0 text-sm">Define el ADN del producto (Ficha Técnica)</p>
                </div>
            </div>

            {/* Unified Form */}
            <ProductForm
                isModal={false}
            />
        </div>
    );
}
