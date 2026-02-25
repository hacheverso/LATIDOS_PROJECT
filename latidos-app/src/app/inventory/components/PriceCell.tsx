"use client";

import { useState, useEffect } from "react";
import { Check, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProductPrice } from "../actions";

export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    stock?: number;
    status?: string;
    upc: string;
    basePrice: number;
    averageCost: number;
    isLastKnownCost?: boolean;
    imageUrl?: string | null;
    margin?: number;
    profit?: number;
}

export const PriceCell = ({ product }: { product: Product }) => {
    const [price, setPrice] = useState(product.basePrice || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Sync state if product prop updates (e.g. after revalidation)
    useEffect(() => {
        setPrice(product.basePrice || 0);
    }, [product.basePrice]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Margin Calculation (Gross Margin)
    const cost = product.averageCost || 0;
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const isDirty = price !== product.basePrice;

    // Formatting helper
    const formatNumber = (num: number) => new Intl.NumberFormat('es-CO').format(num);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
        const numValue = rawValue === "" ? 0 : parseInt(rawValue, 10);
        setPrice(numValue);
    };

    const handleIncrement = (amount: number) => {
        setPrice(prev => Math.max(0, prev + amount));
    };

    const handleSave = async () => {
        if (!isDirty) return;

        setIsSaving(true);
        setStatus('idle');

        const res = await updateProductPrice(product.id, price);

        setIsSaving(false);
        if (res.success) {
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } else {
            setStatus('error');
            alert(res.error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const target = e.currentTarget as HTMLInputElement;
            target.blur();
            handleSave(); // Explicitly save on Enter

            // Move Focus to Next Row
            const row = target.closest('tr') || target.closest('.group'); // support for both table row and mobile card
            if (row) {
                const nextRow = row.nextElementSibling;
                if (nextRow) {
                    const nextInput = nextRow.querySelector('input[type="text"]') as HTMLInputElement;
                    if (nextInput) {
                        setTimeout(() => {
                            nextInput.focus();
                            nextInput.select();
                        }, 50);
                    }
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement(10000);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleIncrement(-10000);
        }
    };

    return (
        <div
            className="relative group/price flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative flex items-center gap-2">
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-bold">$</span>
                    <input
                        id={`price-input-${product.id}`}
                        type="text"
                        value={mounted ? formatNumber(price) : price}
                        onChange={handleChange}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            "w-[120px] pl-5 pr-8 py-1 rounded-lg border text-xs font-semibold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none tabular-nums",
                            status === 'success' ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/20" :
                                status === 'error' ? "border-red-500 text-red-700 bg-red-50 dark:bg-red-500/20" :
                                    isDirty ? "border-blue-400 bg-blue-50/30 dark:bg-blue-500/20 dark:border-blue-500/50" :
                                        "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-card focus:bg-white dark:focus:bg-white/5"
                        )}
                        placeholder="0"
                    />

                    {/* Status Icons */}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : status === 'success' ? (
                            <Check className="w-3 h-3 text-emerald-600 animate-in zoom-in" />
                        ) : null}
                    </div>

                    {/* Steppers - Darker Contrast */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col border-l border-slate-200 dark:border-white/10 pl-1 h-full justify-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(10000); }}
                            className="text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 focus:text-blue-700 dark:focus:text-blue-400 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleIncrement(-10000); }}
                            className="text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 focus:text-blue-700 dark:focus:text-blue-400 h-3 flex items-center"
                            tabIndex={-1}
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Explicit Save Button - Absolute Positioned to avoid layout shift */}
                {isDirty && !isSaving && status !== 'success' && (
                    <div className="absolute left-[145px] top-1/2 -translate-y-1/2 z-10">
                        <button
                            onClick={handleSave}
                            className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm animate-in fade-in zoom-in duration-200"
                            title="Guardar Precio"
                        >
                            <Check className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
