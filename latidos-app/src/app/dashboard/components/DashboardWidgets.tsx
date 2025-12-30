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
import { WeeklySalesChart } from "./DashboardCharts";
import { getSalesTrend } from "../actions";

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

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm flex items-center gap-5 group hover:shadow-md transition-all relative">
            {/* Dropdown in top right */}
            <div className="absolute top-4 right-4">
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                    <SelectTrigger className="h-6 w-[90px] text-[10px] uppercase font-bold text-slate-500 border-none bg-slate-50 rounded-full hover:bg-slate-100 focus:ring-0 px-2 py-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-xl border-slate-100 font-medium text-slate-900">
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <DollarSign className="w-7 h-7" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{labels[period]}</p>
                <div className="flex items-baseline gap-1 animate-in fade-in duration-300">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                        ${values[period].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>
        </div>
    );
}


// --- CLIENT COMPONENT: Trend Chart Widget ---
export function SalesTrendWidget({ initialData }: { initialData: any[] }) {
    const [range, setRange] = useState<"7d" | "15d" | "30d" | "month">("7d");
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


// --- CLIENT COMPONENT: Liquidity Card Breakdown ---
import { Landmark, Wallet } from "lucide-react";

export function LiquidityWidget({ bank, cash }: { bank: number, cash: number }) {
    const total = bank + cash;

    return (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/40 border border-white/60 p-6 rounded-3xl shadow-sm flex flex-col justify-center gap-2 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidez Total</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight">
                            ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Breakdown Lines */}
            <div className="space-y-1.5 pt-2 border-t border-slate-50">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Landmark className="w-3 h-3 text-indigo-400" />
                        <span className="font-medium">Bancos</span>
                    </div>
                    <span className="font-bold text-slate-700">
                        ${bank.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Wallet className="w-3 h-3 text-emerald-400" />
                        <span className="font-medium">Efectivo</span>
                    </div>
                    <span className="font-bold text-slate-700">
                        ${cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>
        </div>
    );
}
