"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createProduct, getCategories } from "../actions";

export default function NewProductPage() {
    const [formData, setFormData] = useState({
        name: "",
        condition: "NEW", // Default
        brand: "",
        model: "",
        upc: "", // Universal Product Code
        sku: "",
        category: "",
        basePrice: "",
        description: "",
        imageUrl: "",
    });
    const [existingCategories, setExistingCategories] = useState<string[]>([]);


    // Advanced SKU Generator Logic
    useEffect(() => {
        if (formData.name) {
            let generated = formData.name.toUpperCase();

            // 1. Cleaning and Standardizing
            generated = generated.replace(/GB/g, ""); // Remove GB
            generated = generated.replace(/\s+/g, "-"); // Spaces to hyphens

            // 2. Abbreviations (Common Tech Words)
            generated = generated.replace(/IPHONE/g, "IPH");
            generated = generated.replace(/ORANGE/g, "ORG");
            generated = generated.replace(/BLACK/g, "BLK");
            generated = generated.replace(/WHITE/g, "WHT");
            generated = generated.replace(/TITANIUM/g, "TI");
            generated = generated.replace(/SAMSUNG/g, "SAM");

            // 3. Condition Suffix
            const suffixMap: Record<string, string> = {
                "NEW": "-N",
                "OPEN_BOX": "-O",
                "USED": "-U"
            };

            const suffix = suffixMap[formData.condition] || "";

            // 4. Combine
            const finalSku = `${generated}${suffix}`;

            // Update State (only overwrite if not manually edited distinct from a previous auto-gen attempt - simplified here to always overwrite for this demo flow)
            setFormData(prev => ({ ...prev, sku: finalSku }));
        }
    }, [formData.name, formData.condition]);

    useEffect(() => {
        getCategories().then(setExistingCategories);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Enforce Uppercase for text fields
        const upperValue = (name !== "description" && name !== "basePrice") ? value.toUpperCase() : value;
        setFormData((prev) => ({ ...prev, [name]: upperValue }));
    };

    // We will use standard form action with hydration specific handling if needed, 
    // but for simplicity with client-side state needed for SKU gen, we can wrap the action.
    const clientAction = async (formData: FormData) => {
        // Appending manual generated SKU if not present (although input is there)
        // actually the input 'name="sku"' will be sent automatically.
        // We just need to add 'brand' which I missed in the form fields.
        try {
            await createProduct(formData);
        } catch (error: any) {
            alert(error.message);
        }
    };

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

            {/* Form Container with High Contrast Inputs */}
            <form action={clientAction} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/60 backdrop-blur-xl p-8 rounded-2xl border border-white/40 shadow-xl">

                {/* Left Column: Core Identity */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200/50 pb-2 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        Identificación
                    </h3>

                    <div className="space-y-4">
                        {/* 1. Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre Completo del Producto</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="EJ: IPHONE 15 PRO MAX 256GB"
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-normal"
                                required
                                tabIndex={1}
                                autoFocus
                            />
                        </div>

                        {/* 2. Condition */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estado Físico (Afecta SKU)</label>
                            <select
                                name="condition"
                                value={formData.condition}
                                onChange={handleChange}
                                className={cn(
                                    "w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-bold text-slate-900 appearance-none transition-all",
                                    formData.condition === "NEW" && "text-green-700 border-green-200 bg-green-50/30",
                                    formData.condition === "OPEN_BOX" && "text-blue-700 border-blue-200 bg-blue-50/30",
                                    formData.condition === "USED" && "text-orange-700 border-orange-200 bg-orange-50/30"
                                )}
                                required
                                tabIndex={2}
                            >
                                <option value="NEW">NUEVO (-N)</option>
                                <option value="OPEN_BOX">OPEN BOX (-O)</option>
                                <option value="USED">USADO (-U)</option>
                            </select>
                        </div>

                        {/* 3. UPC */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Código de Barras (UPC/EAN)</label>
                            <input
                                name="upc"
                                value={formData.upc}
                                onChange={handleChange}
                                placeholder="ESCANEAR CÓDIGO..."
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-slate-900 font-bold tracking-wide placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                                required
                                tabIndex={3}
                            />
                        </div>

                        {/* 3.1 Image URL */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">URL de Imagen (Opcional)</label>
                            <input
                                name="imageUrl"
                                value={formData.imageUrl}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 text-sm placeholder:text-slate-300 placeholder:font-normal"
                                tabIndex={3}
                            />
                        </div>
                    </div>
                </div>



                {/* Brand Field (Hidden/State managed or Added) - Let's add it explicitly for better data */}
                <input type="hidden" name="brand" value={formData.brand || "GENERIC"} />
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200/50 pb-2 mb-4 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-slate-400 text-slate-600">Técnico</Badge>
                        Clasificación
                    </h3>

                    <div className="space-y-4">

                        {/* 4. Category */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Categoría</label>
                            <input
                                list="category-list"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="SELECCIONAR O ESCRIBIR..."
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-bold text-slate-900 text-sm placeholder:font-normal placeholder:text-slate-400"
                                required
                                tabIndex={4}
                                autoComplete="off"
                            />
                            <datalist id="category-list">
                                {existingCategories.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                                {!existingCategories.includes("SMARTPHONES") && <option value="SMARTPHONES" />}
                                {!existingCategories.includes("LAPTOPS") && <option value="LAPTOPS" />}
                                {!existingCategories.includes("TABLETS") && <option value="TABLETS" />}
                            </datalist>
                        </div>

                        {/* Removed Base Price Field */}

                        {/* Read-only Generated SKU */}
                        <div className="pt-4 opacity-80">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SKU Generado (Preview)</label>
                            <input
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-500 font-bold text-sm select-all"
                                readOnly
                                tabIndex={-1} // Skip tab
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-200/50">
                    <Link href="/inventory" className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all uppercase text-xs font-black tracking-wide">
                        Cancelar
                    </Link>
                    <button type="submit" className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xl hover:shadow-blue-500/40 transition-all uppercase text-xs font-black tracking-wide flex items-center gap-2 transform hover:-translate-y-0.5" tabIndex={6}>
                        <Save className="w-4 h-4" />
                        Guardar Maestro
                    </button>
                </div>
            </form >
        </div >
    );
}
