"use client";

import { Star, Trophy, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopCustomer {
    id: string;
    name: string;
    totalBought: number;
    transactionCount: number;
    score: number; // 1-5
}

interface SalesIntelligenceCardsProps {
    metrics: {
        averageTicket: number;
        totalRevenue: number;
        topCustomers: TopCustomer[];
    };
}

export function SalesIntelligenceCards({ metrics }: SalesIntelligenceCardsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI 1: Ticket Promedio */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ticket Promedio</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 tracking-tight">
                        ${Math.round(metrics.averageTicket).toLocaleString('es-CO')}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                        Valor medio por factura
                    </div>
                </div>
            </div>

            {/* KPI 2: Top Customers Carousel (Spans 3 cols) */}
            <div className="lg:col-span-3 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col justify-center">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="bg-yellow-400/20 p-2 rounded-lg">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-tight">Top Clientes VIP</h3>
                        <p className="text-xs text-slate-400 font-medium">Mejores compradores del periodo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                    {metrics.topCustomers.length === 0 && (
                        <div className="text-sm text-slate-500 italic col-span-full">No hay datos suficientes aún.</div>
                    )}
                    {metrics.topCustomers.slice(0, 5).map((customer, index) => (
                        <div key={customer.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/20 transition-all group cursor-default">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-sm truncate pr-2 w-full" title={customer.name}>
                                    {index + 1}. {customer.name}
                                </div>
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={cn("w-3 h-3", i < customer.score ? "fill-current" : "text-slate-600")}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total</div>
                                    <div className="text-xl font-black text-white tracking-tight">
                                        ${(customer.totalBought / 1000000).toFixed(1)}M
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tx</div>
                                    <div className="text-sm font-bold text-white">
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
