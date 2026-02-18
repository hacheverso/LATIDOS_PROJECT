"use client";

import { useState, useEffect } from "react";
import { DollarSign, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { WeeklySalesChart, TopCategoriesChart } from "./DashboardCharts";
import { getSalesTrend, getTopCategories } from "../actions";

// --- CLIENT COMPONENT: Sales KPI Widget ---
export function SalesKPIWidget({ metrics }: { metrics: { today: number, month: number, year: number } }) {
    const [period, setPeriod] = useState<"today" | "month" | "year">("today");

    const labels = {
        today: "Ventas (Hoy)",
        month: "Ventas (Mes)",
        year: "Ventas (Año)"
    };

    const values = {
        today: metrics.today,
        month: metrics.month,
        year: metrics.year
    };

    const formattedValue = values[period].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const valueLength = formattedValue.length;
    const textSize = valueLength > 12 ? "text-3xl" : "text-4xl"; // Responsive font size

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-5 rounded-3xl shadow-sm flex flex-col gap-1 group hover:shadow-md transition-all relative overflow-hidden">
            {/* Row 1: Header (Icon + Title + Filter) */}
            <div className="flex items-center justify-between w-full z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-emerald-100">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{labels[period]}</p>
                </div>

                {/* Filter - Aligned Right */}
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                    <SelectTrigger className="h-7 w-[95px] text-[10px] uppercase font-bold text-slate-600 border border-slate-200 bg-white shadow-sm rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all focus:ring-0 px-2.5">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-xl border-slate-100 font-medium text-slate-900">
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Row 2: Big Number (Leading Aligned) */}
            <div className="mt-2 text-left z-10">
                <p className={cn("font-black text-slate-900 tracking-tight leading-none", textSize)}>
                    ${formattedValue}
                </p>
            </div>

            {/* Background Decor */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
        </div>
    );
}


// --- CLIENT COMPONENT: Trend Chart Widget ---
export function SalesTrendWidget({ initialData }: { initialData: any[] }) {
    const [range, setRange] = useState<"7d" | "15d" | "30d" | "month" | "year">("7d");
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Skip first render if using initialData, or manage effect carefully
    }, []);

    const handleRangeChange = async (newRange: string) => {
        // @ts-ignore
        setRange(newRange);
        setLoading(true);
        try {
            // @ts-ignore
            const newData = await getSalesTrend(newRange);
            setData(newData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lg:col-span-2 backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm relative">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">
                    Comportamiento de Ventas
                </h3>

                {/* Filter Selector */}
                <Select value={range} onValueChange={handleRangeChange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs font-medium bg-slate-50 border-slate-200 rounded-full text-slate-900">
                        <SelectValue placeholder="Rango" />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-xl border-slate-100 font-medium text-slate-900">
                        <SelectItem value="7d">Últimos 7 días</SelectItem>
                        <SelectItem value="15d">Últimos 15 días</SelectItem>
                        <SelectItem value="30d">Últimos 30 días</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("relative", loading && "opacity-50 pointer-events-none")}>
                <WeeklySalesChart data={data} />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}

// --- CLIENT COMPONENT: Top Categories Widget ---
export function TopCategoriesWidget({ initialData }: { initialData: any[] }) {
    const [range, setRange] = useState<"7d" | "30d" | "month" | "year">("30d");
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const handleRangeChange = async (newRange: string) => {
        // @ts-ignore
        setRange(newRange);
        setLoading(true);
        try {
            // @ts-ignore
            const newData = await getTopCategories(newRange);
            setData(newData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const labels = {
        "7d": "7 Días",
        "30d": "30 Días",
        "month": "Este Mes",
        "year": "Este Año"
    };

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm flex flex-col relative">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">
                    Top Ventas por Categoría
                </h3>

                <Select value={range} onValueChange={handleRangeChange}>
                    <SelectTrigger className="h-6 w-auto min-w-[80px] text-[10px] uppercase font-bold text-slate-600 border-none bg-slate-100 rounded-full hover:bg-slate-200 focus:ring-0 px-3 py-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-xl border-slate-100 font-medium text-slate-900">
                        <SelectItem value="7d">7 Días</SelectItem>
                        <SelectItem value="30d">30 Días</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex-1 min-h-0 relative", loading && "opacity-50 pointer-events-none")}>
                <TopCategoriesChart data={data} />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}


// --- CLIENT COMPONENT: Liquidity Card Breakdown ---
import { Landmark, Wallet } from "lucide-react";

export function LiquidityWidget({ bank, cash }: { bank: number, cash: number }) {
    const total = bank + cash;
    const bankStr = bank.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const cashStr = cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const totalStr = total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const totalLen = totalStr.length;
    const textSize = totalLen > 12 ? "text-3xl" : "text-4xl";

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-5 rounded-3xl shadow-sm flex flex-col gap-1 group hover:shadow-md transition-all relative overflow-hidden">
            {/* Row 1: Header */}
            <div className="flex items-center gap-3 w-full z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-indigo-100">
                    <Landmark className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidez Total</p>
            </div>

            {/* Row 2: Big Number */}
            <div className="mt-2 text-left z-10">
                <p className={cn("font-black text-slate-900 tracking-tight leading-none", textSize)}>
                    ${totalStr}
                </p>
            </div>

            {/* Breakdown Lines */}
            <div className="space-y-1.5 pt-3 mt-1 border-t border-slate-100/50 z-10">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Landmark className="w-3 h-3 text-indigo-400" />
                        <span className="font-medium">Bancos</span>
                    </div>
                    <span className="font-bold text-slate-700">${bankStr}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Wallet className="w-3 h-3 text-emerald-400" />
                        <span className="font-medium">Efectivo</span>
                    </div>
                    <span className="font-bold text-slate-700">${cashStr}</span>
                </div>
            </div>

            {/* Background Decor */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
        </div>
    );
}
