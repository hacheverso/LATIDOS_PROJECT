"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { Save, Sparkles, X, Loader2, AlertTriangle, Image as ImageIcon, Clipboard, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProduct, generateUniqueSku, getCategoriesWithCount, searchProducts } from "../actions";

interface QuickCreateProductModalProps {
    onClose: () => void;
    onSuccess: (newProduct: any) => void;
    prefilledUpc: string;
}

export default function QuickCreateProductModal({ onClose, onSuccess, prefilledUpc }: QuickCreateProductModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        condition: "NEW",
        brand: "GENERIC", // Hidden default
        model: "",
        upc: prefilledUpc,
        sku: "",
        category: "",
        basePrice: "", // Not used in quick create explicitly but good to have
        description: "",
        imageUrl: "",
    });

    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [exactMatchWarning, setExactMatchWarning] = useState(false);

    const toggleRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetch
    useEffect(() => {
        getCategoriesWithCount().then((cats: any[]) => setExistingCategories(cats.map(c => c.name)));
    }, []);

    // Generate SKU Logic
    useEffect(() => {
        if (!formData.name) return;

        const generate = async () => {
            let processedName = formData.name.toUpperCase();

            const brandMap: Record<string, string> = {
                "RAY-BAN": "RB", "RAYBAN": "RB", "APPLE": "APL", "SAMSUNG": "SAM",
                "META": "MT", "SONY": "SNY", "BOSE": "BSE", "GOOGLE": "GGL"
            };

            Object.keys(brandMap).forEach(brand => {
                const regex = new RegExp(`\\b${brand}\\b`, "g");
                processedName = processedName.replace(regex, brandMap[brand]);
            });

            processedName = processedName.replace(/\b(SHINY|MATTE|GLOSSY)\b/g, "");
            processedName = processedName.replace(/GB/g, "");
            processedName = processedName.replace(/[^A-Z0-9\s-]/g, "");
            processedName = processedName.replace(/\s+/g, "-");

            const blocks = processedName.split("-").filter(b => b.length > 0);
            const optimizedBlocks = blocks.map(block => {
                if (block.length <= 4 || /\d/.test(block)) return block;
                const first = block[0];
                const rest = block.slice(1).replace(/[AEIOU]/g, "");
                return (first + rest).slice(0, 4);
            });

            let baseSku = optimizedBlocks.join("-");
            const suffixMap: Record<string, string> = { "NEW": "-N", "OPEN_BOX": "-O", "USED": "-U" };
            baseSku += suffixMap[formData.condition] || "";

            try {
                const uniqueSku = await generateUniqueSku(baseSku);
                setFormData(prev => ({ ...prev, sku: uniqueSku }));
            } catch (e) {
                console.error(e);
                setFormData(prev => ({ ...prev, sku: baseSku }));
            }
        };

        const timer = setTimeout(generate, 500);
        return () => clearTimeout(timer);
    }, [formData.name, formData.condition]);

    // Name Autocomplete Logic
    useEffect(() => {
        if (formData.name.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            setExactMatchWarning(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchProducts(formData.name);
                setSuggestions(results);
                setShowSuggestions(true);

                // Check for exact match
                const exact = results.find(p => p.name.toUpperCase() === formData.name.toUpperCase());
                setExactMatchWarning(!!exact);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [formData.name]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const upperValue = (name !== "imageUrl") ? value.toUpperCase() : value;
        setFormData((prev) => ({ ...prev, [name]: upperValue }));
    };

    const handlePasteImage = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setFormData(prev => ({ ...prev, imageUrl: text }));
            }
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            // Fallback: Focus input so user can ctrl+v
            const input = document.querySelector('input[name="imageUrl"]') as HTMLInputElement;
            input?.focus();
        }
    };

    const handleSuggestionClick = (product: any) => {
        setFormData(prev => ({
            ...prev,
            name: product.name, // Prefill name
            category: product.category || prev.category, // Auto Category
        }));
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (exactMatchWarning) {
            const confirm = window.confirm("¡ATENCIÓN! Un producto con este nombre exacto ya existe. ¿Seguro que desea crear uno nuevo duplicado?");
            if (!confirm) return;
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));

            const newProduct = await createProduct(submitData);
            setIsSubmitting(false);
            onSuccess(newProduct);
        } catch (error) {
            alert((error as Error).message);
            setIsSubmitting(false);
        }
    };

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toggleRef.current && !toggleRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-8 space-y-6 bg-white relative">
                    <form id="quick-create-form" onSubmit={handleSubmit} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* 1. NAME (Autocomplete) */}
                            <div className="md:col-span-2 relative" ref={toggleRef}>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                                    Nombre del Producto
                                    {isSearching && <span className="text-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="EJ: IPHONE 15 PRO MAX 256GB"
                                        className={cn(
                                            "w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none uppercase font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium transition-all",
                                            exactMatchWarning && "border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500/10"
                                        )}
                                        required
                                        autoFocus
                                        autoComplete="off"
                                    />
                                    {/* Warnings */}
                                    {exactMatchWarning && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500 flex items-center gap-2 pointer-events-none">
                                            <span className="text-[10px] font-black uppercase hidden sm:inline">Ya existe</span>
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                    )}

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                                                Sugerencias Similares
                                            </div>
                                            {suggestions.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSuggestionClick(p)}
                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                                >
                                                    <span className="font-bold text-slate-700 text-xs uppercase group-hover:text-blue-700">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {p.category || "N/A"}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. CONDITION */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado</label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className={cn(
                                        "w-full h-12 bg-white border border-slate-200 rounded-xl px-4 focus:border-blue-500 outline-none uppercase font-bold text-sm appearance-none cursor-pointer",
                                        formData.condition === "NEW" && "text-green-600",
                                        formData.condition === "OPEN_BOX" && "text-blue-600",
                                        formData.condition === "USED" && "text-orange-600"
                                    )}
                                >
                                    <option value="NEW">NUEVO (-N)</option>
                                    <option value="OPEN_BOX">OPEN BOX (-O)</option>
                                    <option value="USED">USADO (-U)</option>
                                </select>
                            </div>

                            {/* 3. UPC (LOCKED) */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    Código de Barras (UPC)
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 text-slate-400">Locked</Badge>
                                </label>
                                <div className="relative">
                                    <input
                                        name="upc"
                                        value={formData.upc}
                                        readOnly
                                        className="w-full h-12 bg-slate-100 border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-500 outline-none cursor-not-allowed select-all"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* 4. SKU (AUTO) */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SKU (Auto-Generado)</label>
                                <input
                                    name="sku"
                                    value={formData.sku}
                                    readOnly
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-500 text-xs select-all outline-none"
                                />
                            </div>

                            {/* 5. CATEGORY */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
                                <input
                                    list="quick-category-list"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="SELECCIONAR..."
                                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none uppercase font-bold text-slate-900 text-sm placeholder:font-medium placeholder:text-slate-300 transition-all"
                                    required
                                    autoComplete="off"
                                />
                                <datalist id="quick-category-list">
                                    {existingCategories.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                    {!existingCategories.includes("SMARTPHONES") && <option value="SMARTPHONES" />}
                                    {!existingCategories.includes("LAPTOPS") && <option value="LAPTOPS" />}
                                    {!existingCategories.includes("TABLETS") && <option value="TABLETS" />}
                                </datalist>
                            </div>

                            {/* 6. IMAGE URL (NEW) */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 justify-between flex">
                                    URL de Imagen (Opcional)
                                    <button onClick={handlePasteImage} type="button" className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors">
                                        <Clipboard className="w-3 h-3" /> Pegar
                                    </button>
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        name="imageUrl"
                                        value={formData.imageUrl}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-600 text-xs placeholder:font-medium placeholder:text-slate-300 transition-all truncate"
                                    />
                                </div>
                            </div>

                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 z-20 relative">
                    <button type="button" onClick={onClose} className="px-6 h-12 rounded-xl text-slate-500 font-bold uppercase text-xs hover:bg-slate-200 transition-colors">
                        Cancelar
                    </button>
                    <button
                        form="quick-create-form"
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-wide shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Crear y Vincular
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
