"use client";
/* eslint-disable */

import { useEffect, useState } from "react";
import { getProductIntelligence } from "@/app/inventory/actions";
import { AlertTriangle, TrendingDown, RefreshCw, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PricingIntelligence({ productId }: { productId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProductIntelligence(productId).then(res => {
            setData(res);
            setLoading(false);
        });
    }, [productId]);

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="space-y-4">
            {/* Title */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-wide">Inteligencia de Precios</h3>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Days in Inventory */}
                <div className={cn(
                    "p-4 rounded-2xl border-2 flex flex-col justify-between",
                    data.daysInInventory > 30 ? "bg-red-50 border-red-100 text-red-700" : "bg-white border-slate-100 text-slate-600"
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase opacity-70">Días en Stock</span>
                        <Clock className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="text-2xl font-black">
                        {data.daysInInventory} <span className="text-xs font-bold opacity-60">días</span>
                    </p>
                </div>

                {/* Velocity */}
                <div className="p-4 rounded-2xl border-2 bg-white border-slate-100 text-slate-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase opacity-70">Velocidad</span>
                        <RefreshCw className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="text-2xl font-black flex items-end gap-1">
                        {data.weeklyVelocity} <span className="text-xs font-bold opacity-60 pb-1">u/sem</span>
                    </p>
                </div>

                {/* Margin */}
                <div className={cn(
                    "p-4 rounded-2xl border-2 flex flex-col justify-between",
                    data.marginPercent < 15 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase opacity-70">Margen</span>
                        <DollarSign className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="text-2xl font-black flex items-end gap-1">
                        {data.marginPercent.toFixed(1)}<span className="text-sm font-bold opacity-60 pb-1">%</span>
                    </p>
                </div>

                {/* Suggested Action - Only if warning */}
                {data.alertLevel !== "normal" && (
                    <div className="col-span-2 md:col-span-1 p-4 rounded-2xl border-2 bg-slate-900 border-slate-800 text-white flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sugerencia IA</span>
                        </div>
                        <p className="text-xs font-medium leading-tight opacity-90">
                            {data.suggestion}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
