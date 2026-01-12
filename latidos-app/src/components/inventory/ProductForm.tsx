"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { Save, Sparkles, Loader2, AlertTriangle, Image as ImageIcon, Clipboard, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
// Import from actions relative to this component. 
// Path: src/components/inventory/ProductForm.tsx -> ../../app/inventory/actions.ts
import { createProductAction, generateUniqueSku, getCategoriesWithCount, searchProducts } from "../../app/inventory/actions";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { PlusSquare } from "lucide-react";

interface ProductFormProps {
    onSuccess?: (product: any) => void;
    onCancel?: () => void;
    isModal?: boolean;
    prefilledUpc?: string;
}
export default function ProductForm({ onSuccess, onCancel, isModal = false, prefilledUpc = "" }: ProductFormProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [formData, setFormData] = useState({
        name: "",
        condition: "NEW", // Default
        brand: "GENERIC",
        model: "",
        upc: prefilledUpc,
        sku: "",
        category: "",
        basePrice: "",
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

    // Image Preview State
    const [imageStatus, setImageStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

    // Image Validation Effect
    useEffect(() => {
        if (!formData.imageUrl) {
            setImageStatus("idle");
            return;
        }

        setImageStatus("loading");
        const img = new Image();
        img.src = formData.imageUrl;

        img.onload = () => setImageStatus("success");
        img.onerror = () => setImageStatus("error");

    }, [formData.imageUrl]);

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
            const input = document.querySelector('input[name="imageUrl"]') as HTMLInputElement;
            input?.focus();
        }
    };

    const handleSuggestionClick = (product: any) => {
        setFormData(prev => ({
            ...prev,
            name: product.name,
            category: product.category || prev.category,
        }));
        setShowSuggestions(false);
    };

    const handleSubmit = async (e?: React.FormEvent, createAnother: boolean = false) => {
        if (e) e.preventDefault();

        if (exactMatchWarning) {
            const confirm = window.confirm("¡ATENCIÓN! Un producto con este nombre exacto ya existe. ¿Seguro que desea crear uno nuevo duplicado?");
            if (!confirm) return;
        }

        setIsSubmitting(true);
        try {
            // Prepare data for server action
            const result = await createProductAction({
                name: formData.name,
                category: formData.category,
                condition: formData.condition as "NEW" | "OPEN_BOX" | "USED",
                upc: formData.upc,
                sku: formData.sku,
                imageUrl: formData.imageUrl,
                basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
                brand: formData.brand,
                description: formData.description
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Producto creado exitosamente");

            if (createAnother) {
                // Return to clean state but keep category
                setFormData(prev => ({
                    ...prev,
                    name: "",
                    upc: "", // Reset UPC for new scan
                    sku: "",
                    basePrice: "",
                    description: "",
                    imageUrl: ""
                    // Keep category, condition, brand
                }));
                // Use a small timeout to allow UI to settle if needed, or just focus
                const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
                nameInput?.focus();
            } else {
                if (onSuccess) {
                    onSuccess(result.product);
                } else {
                    // Logic: Redirect ONLY if we are in main inventory list context
                    // and NOT in create-another mode.
                    const isInventoryContext = pathname === "/inventory" || pathname === "/inventory/products";
                    // If we are at /inventory/new, we also likely want to redirect to detail
                    const isCreationPage = pathname?.includes("/inventory/new");

                    if (isInventoryContext || isCreationPage) {
                        router.push(`/inventory/${result.product?.id}`);
                        router.refresh();
                    } else {
                        // Modal context or other: Just success toast (already shown)
                        // Maybe reset form?
                        setFormData({
                            name: "",
                            condition: "NEW",
                            brand: "GENERIC",
                            model: "",
                            upc: "",
                            sku: "",
                            category: "",
                            basePrice: "",
                            description: "",
                            imageUrl: "",
                        });
                    }
                }
            }
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
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

    const CancelButton = () => (
        <button
            type="button"
            onClick={onCancel ? onCancel : () => router.back()}
            className={cn(
                "rounded-xl font-bold uppercase tracking-wide transition-all",
                isModal
                    ? "px-6 h-12 text-slate-500 text-xs hover:bg-slate-200"
                    : "px-6 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-xs"
            )}
        >
            Cancelar
        </button>
    );

    const SaveButton = () => (
        <div className="flex gap-2">
            {!isModal && (
                <button
                    type="button"
                    onClick={() => handleSubmit(undefined, true)}
                    disabled={isSubmitting}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold uppercase tracking-wide text-xs hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center gap-2 "
                >
                    <PlusSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Guardar y Crear Otro</span>
                </button>
            )}
            <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                    "rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xl font-black uppercase tracking-wide flex items-center gap-2 transform disabled:opacity-50 disabled:cursor-not-allowed transition-all",
                    isModal
                        ? "px-8 h-12 text-xs shadow-blue-500/30"
                        : "px-8 py-3 text-xs shadow-blue-500/40 hover:-translate-y-0.5"
                )}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        {isModal ? "Crear y Vincular" : "Guardar Producto"}
                    </>
                )}
            </button>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", !isModal && "gap-8 bg-white/60 backdrop-blur-xl p-8 rounded-2xl border border-white/40 shadow-xl")}>

            {!isModal && (
                <div className="md:col-span-2 space-y-2">
                    <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200/50 pb-2 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        Identificación
                    </h3>
                </div>
            )}

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
                            "w-full bg-white border-2 border-slate-200 rounded-xl px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none uppercase font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium transition-all",
                            isModal ? "h-12" : "py-3",
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
                        "w-full bg-white border border-slate-200 rounded-xl px-4 focus:border-blue-500 outline-none uppercase font-bold text-sm appearance-none cursor-pointer transition-all",
                        isModal ? "h-12" : "py-3",
                        formData.condition === "NEW" && "text-green-600 border-green-200 bg-green-50/30",
                        formData.condition === "OPEN_BOX" && "text-blue-600 border-blue-200 bg-blue-50/30",
                        formData.condition === "USED" && "text-orange-600 border-orange-200 bg-orange-50/30"
                    )}
                >
                    <option value="NEW">NUEVO (-N)</option>
                    <option value="OPEN_BOX">OPEN BOX (-O)</option>
                    <option value="USED">USADO (-U)</option>
                </select>
            </div>

            {/* 3. UPC */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    Código de Barras (UPC)
                    {prefilledUpc && <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 text-slate-400">Locked</Badge>}
                </label>
                <div className="relative">
                    <input
                        name="upc"
                        value={formData.upc}
                        onChange={handleChange}
                        readOnly={!!prefilledUpc}
                        placeholder="ESCANEAR..."
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 tracking-wide",
                            isModal ? "h-12" : "py-3",
                            !!prefilledUpc && "bg-slate-100 text-slate-500 cursor-not-allowed select-all"
                        )}
                        required
                    />
                    {prefilledUpc && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    )}
                </div>
            </div>

            {/* 3.1 Image URL */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 justify-between flex">
                    URL de Imagen (Opcional)
                    <button onClick={handlePasteImage} type="button" className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors">
                        <Clipboard className="w-3 h-3" /> Pegar
                    </button>
                </label>
                <div className="relative group">
                    {/* Preview / Icon Container */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded overflow-hidden">
                        {imageStatus === "loading" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {imageStatus === "error" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {imageStatus === "success" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={formData.imageUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                        )}
                        {imageStatus === "idle" && <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>

                    <input
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        placeholder="https://..."
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-600 text-xs placeholder:font-medium placeholder:text-slate-300 transition-all truncate",
                            isModal ? "h-12" : "py-3",
                            imageStatus === "success" && "border-green-200 bg-green-50/10 focus:border-green-400 focus:ring-green-400/10",
                            imageStatus === "error" && "border-red-200 bg-red-50/10 focus:border-red-400 focus:ring-red-400/10 text-red-500"
                        )}
                    />

                    {/* Success Indicator Tick */}
                    {imageStatus === "success" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in fade-in zoom-in spin-in-12">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>

            {/* 4. SKU (AUTO) */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SKU (Auto-Generado)</label>
                <input
                    name="sku"
                    value={formData.sku}
                    readOnly
                    className={cn(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 font-mono font-bold text-slate-500 text-xs select-all outline-none",
                        isModal ? "h-12" : "py-3"
                    )}
                />
            </div>

            {/* 5. CATEGORY */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
                <input
                    list="product-form-category-list"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="SELECCIONAR..."
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-xl px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none uppercase font-bold text-slate-900 text-sm placeholder:font-medium placeholder:text-slate-300 transition-all",
                        isModal ? "h-12" : "py-3"
                    )}
                    required
                    autoComplete="off"
                />
                <datalist id="product-form-category-list">
                    {existingCategories.map(cat => (
                        <option key={cat} value={cat} />
                    ))}
                    {!existingCategories.includes("SMARTPHONES") && <option value="SMARTPHONES" />}
                    {!existingCategories.includes("LAPTOPS") && <option value="LAPTOPS" />}
                    {!existingCategories.includes("TABLETS") && <option value="TABLETS" />}
                </datalist>
            </div>

            {/* Footer Buttons */}
            {isModal ? (
                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <CancelButton />
                    <SaveButton />
                </div>
            ) : (
                <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-200/50">
                    <CancelButton />
                    <SaveButton />
                </div>
            )}

        </form>
    );
}
