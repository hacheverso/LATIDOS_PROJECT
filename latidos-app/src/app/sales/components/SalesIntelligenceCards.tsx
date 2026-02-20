"use client";

import { Star, Trophy, AlertCircle, CheckCircle2, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TopCustomer {
    id: string;
    name: string;
    totalBought: number;
    transactionCount: number;
    pendingBalance: number;
    score: number; // 1-5
}

interface SalesIntelligenceCardsProps {
    metrics: {
        debtMetrics: {
            totalDebt: number;
            cleanDebt: number;
            criticalDebt: number;
        };
        totalRevenue: number;
        topCustomers: TopCustomer[];
    };
}

export function SalesIntelligenceCards({ metrics }: SalesIntelligenceCardsProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI 1: Panel de Cartera (Replaces Ticket Promedio) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-slate-400">
                            <Wallet className="w-5 h-5 text-slate-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Panel de Cartera</span>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">Deuda Total</div>
                            <div className="text-3xl font-black text-slate-800 tracking-tight">
                                ${Math.round(metrics.debtMetrics.totalDebt).toLocaleString('es-CO')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        {/* Clean Debt */}
                        <div
                            onClick={() => router.push('?status=PENDING')}
                            className="flex justify-between items-center p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer group/clean"
                            title="Deuda al día (dentro del plazo de crédito)"
                        >
                            <div className="flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Limpia</span>
                            </div>
                            <div className="text-sm font-black text-emerald-700">
                                ${Math.round(metrics.debtMetrics.cleanDebt).toLocaleString('es-CO')}
                            </div>
                        </div>

                        {/* Critical Debt */}
                        <div
                            onClick={() => router.push('?status=OVERDUE')}
                            className="flex justify-between items-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer group/critical"
                            title="Deuda que ha superado los días de plazo"
                        >
                            <div className="flex items-center gap-1.5 text-rose-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Crítica</span>
                            </div>
                            <div className="text-sm font-black text-rose-700">
                                ${Math.round(metrics.debtMetrics.criticalDebt).toLocaleString('es-CO')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI 2: Top Customers VIP (Spans 3 cols) */}
            <div className="lg:col-span-3 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-5 relative z-10">
                    <div className="bg-yellow-400/20 p-2.5 rounded-xl border border-yellow-400/10">
                        <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-md" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl uppercase tracking-tight text-white drop-shadow-sm">Top Clientes VIP</h3>
                        <p className="text-xs text-slate-400 font-medium">Calificados por volumen y salud de cartera</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                    {metrics.topCustomers.length === 0 && (
                        <div className="text-sm text-slate-400 italic col-span-full">No hay datos suficientes aún.</div>
                    )}
                    {metrics.topCustomers.slice(0, 5).map((customer, index) => (
                        <div key={customer.id} className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-all flex flex-col justify-between">

                            {/* Header: Ranking & Stars */}
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-xs font-bold text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-md">
                                    #{index + 1}
                                </div>
                                <div className="flex text-yellow-400/90 gap-0.5 drop-shadow-sm">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={cn("w-3.5 h-3.5", i < customer.score ? "fill-current" : "text-slate-700")}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Center: Customer Name (Protagonist) */}
                            <div className="mb-4">
                                <div className="font-bold text-base leading-tight text-white mb-1 line-clamp-2" title={customer.name}>
                                    {customer.name}
                                </div>
                                {customer.pendingBalance > 0 ? (
                                    <div className="text-[10px] font-medium text-rose-300/80 flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" />
                                        Deuda: ${Math.round(customer.pendingBalance).toLocaleString('es-CO')}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-medium text-emerald-400/70 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Al día
                                    </div>
                                )}
                            </div>

                            {/* Footer: Volume & Tx */}
                            <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                                <div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Volumen</div>
                                    <div className="text-sm font-black text-slate-200 tracking-tight">
                                        ${(customer.totalBought / 1000000).toFixed(1)}M
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Ventas</div>
                                    <div className="text-sm font-bold text-slate-400">
                                        {customer.transactionCount}
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
