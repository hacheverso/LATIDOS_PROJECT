"use client";

import { motion } from "framer-motion";
import { Wallet, Landmark, TrendingUp, Layers } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface LiquidityTiersProps {
    accounts: any[];
    onFilterClick?: (type: string | null) => void;
    activeFilter?: string | null;
}

export function LiquidityTiers({ accounts, onFilterClick, activeFilter }: LiquidityTiersProps) {
    // Helper to identify System Assets (by Type OR Name)
    const isSystemAsset = (a: any) =>
        ["RETOMA", "NOTA_CREDITO", "GARANTIA"].includes(a.type) ||
        /retoma|garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(a.name);

    // Tier 1: Operative (Exclude System Assets)
    const operativeAccounts = accounts.filter((a) => !isSystemAsset(a));

    // Tier 2: System Assets
    const systemAccounts = accounts.filter((a) => isSystemAsset(a));

    const operativeTotal = operativeAccounts.reduce(
        (acc, curr) => acc + Number(curr.balance),
        0
    );

    const systemTotal = systemAccounts.reduce(
        (acc, curr) => acc + Number(curr.balance),
        0
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* TIER 1: LIQUIDEZ OPERATIVA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`md:col-span-7 lg:col-span-8 relative overflow-hidden group rounded-3xl p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] border border-white/10 ${operativeTotal < 0
                    ? "bg-gradient-to-br from-rose-500 to-rose-700"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-700"
                    }`}
            >
                <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-3 text-white/80 mb-2">
                        <div className="p-2 rounded-full bg-white/20 text-white">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-medium tracking-wide uppercase">Liquidez Disponible</h3>
                    </div>

                    <div className="mt-4">
                        <span className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                            {formatCurrency(operativeTotal)}
                        </span>
                        <p className="mt-2 text-white/70 text-sm font-medium tracking-wide">
                            Efectivo en Caja + Cuentas Bancarias
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* TIER 2: ACTIVOS EN SISTEMA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="md:col-span-5 lg:col-span-4 relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)]"
            >
                <div className="absolute bottom-0 right-0 p-20 bg-blue-50/50 rounded-full blur-[80px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-slate-400 mb-6">
                        <Layers className="w-4 h-4" />
                        <h3 className="text-xs font-semibold tracking-wider uppercase">Activos en Sistema</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <span className="text-3xl font-semibold text-blue-600 tracking-tight">
                                {formatCurrency(systemTotal)}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">
                                Retomas + Notas Crédito
                            </p>
                        </div>

                        {/* Micro Breakdown */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                            <div
                                onClick={() => onFilterClick?.(activeFilter === 'RETOMA' ? null : 'RETOMA')}
                                className={`flex flex-col p-2 rounded-lg transition-colors cursor-pointer ${activeFilter === 'RETOMA' ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                            >
                                <span className="text-xs text-slate-400">Retomas</span>
                                <span className="text-sm text-slate-600 font-medium">
                                    {formatCurrency(systemAccounts.filter(a => a.type === 'RETOMA' || /retoma/i.test(a.name)).reduce((sum, a) => sum + Number(a.balance), 0))}
                                </span>
                            </div>
                            <div
                                onClick={() => onFilterClick?.(activeFilter === 'NOTA_CREDITO' ? null : 'NOTA_CREDITO')}
                                className={`flex flex-col p-2 rounded-lg transition-colors cursor-pointer ${activeFilter === 'NOTA_CREDITO' ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                            >
                                <span className="text-xs text-slate-400">Garantías</span>
                                <span className="text-sm text-slate-600 font-medium">
                                    {formatCurrency(systemAccounts.filter(a => a.type === 'NOTA_CREDITO' || /garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(a.name)).reduce((sum, a) => sum + Number(a.balance), 0))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
