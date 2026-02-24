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
    // Helper to identify System Assets
    const isRetoma = (a: any) => a.type === 'RETOMA' || /retoma/i.test(a.name);
    const isGarantia = (a: any) => a.type === 'NOTA_CREDITO' || /garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(a.name);
    const isSystemAsset = (a: any) => isRetoma(a) || isGarantia(a);

    // Tier 1: Operative
    const operativeAccounts = accounts.filter((a) => !isSystemAsset(a) && !a.isArchived);

    // Sub-segment Operative
    const efectivoAccounts = operativeAccounts.filter(a => a.type === 'CASH' || /efectivo|caja|oficina/i.test(a.name));
    const bancoAccounts = operativeAccounts.filter(a => !efectivoAccounts.includes(a));

    const efectivoTotal = efectivoAccounts.reduce((acc, curr) => acc + Number(curr.balance), 0);
    const bancoTotal = bancoAccounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    let highestLiquidityAccount = operativeAccounts[0];
    for (const acc of operativeAccounts) {
        if (Number(acc.balance) > Number(highestLiquidityAccount?.balance || 0)) {
            highestLiquidityAccount = acc;
        }
    }

    // Tier 2: System Assets
    const systemAccounts = accounts.filter((a) => isSystemAsset(a) && !a.isArchived);
    const retomasTotal = systemAccounts.filter(isRetoma).reduce((acc, curr) => acc + Number(curr.balance), 0);
    const garantiasTotal = systemAccounts.filter(isGarantia).reduce((acc, curr) => acc + Number(curr.balance), 0);
    const systemNetTotal = retomasTotal - garantiasTotal; // Garantías is a deduction now

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* TIER 1: LIQUIDEZ OPERATIVA (3 CARDS) */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col md:flex-row gap-4">

                {/* Efectivo Total */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-emerald-600 mb-4">
                        <Wallet className="w-5 h-5" />
                        <h3 className="text-xs font-bold tracking-wider uppercase">Efectivo Total</h3>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-emerald-700 tracking-tight">
                            {formatCurrency(efectivoTotal)}
                        </span>
                        <p className="text-xs text-emerald-600/70 mt-1 font-medium">Cajas de Oficinas y Efectivo</p>
                    </div>
                </motion.div>

                {/* Total en Bancos */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex-1 relative overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-blue-600 mb-4">
                        <Landmark className="w-5 h-5" />
                        <h3 className="text-xs font-bold tracking-wider uppercase">Total Bancos</h3>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-blue-700 tracking-tight">
                            {formatCurrency(bancoTotal)}
                        </span>
                        <p className="text-xs text-blue-600/70 mt-1 font-medium">Cuentas Bancarias / Digitales</p>
                    </div>
                </motion.div>

                {/* Mayor Liquidez */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 relative overflow-hidden rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-indigo-600 mb-4">
                        <TrendingUp className="w-5 h-5" />
                        <h3 className="text-xs font-bold tracking-wider uppercase">Mayor Liquidez</h3>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-indigo-700 tracking-tight truncate block" title={highestLiquidityAccount ? formatCurrency(Number(highestLiquidityAccount.balance)) : "$0"}>
                            {highestLiquidityAccount ? formatCurrency(Number(highestLiquidityAccount.balance)) : "$0"}
                        </span>
                        <p className="text-xs text-indigo-600/70 mt-1 font-bold uppercase truncate">
                            EN: {highestLiquidityAccount ? highestLiquidityAccount.name : "N/A"}
                        </p>
                    </div>
                </motion.div>

            </div>

            {/* TIER 2: ACTIVOS EN SISTEMA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="md:col-span-5 lg:col-span-4 relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            >
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-4">
                            <Layers className="w-4 h-4" />
                            <h3 className="text-xs font-bold tracking-wider uppercase">Activos en Sistema</h3>
                        </div>
                        <span className={`text-3xl font-black tracking-tight ${systemNetTotal < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                            {formatCurrency(systemNetTotal)}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">
                            Retomas Netas (Menos Garantías)
                        </p>
                    </div>

                    {/* Micro Breakdown */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50 mt-4">
                        <div
                            onClick={() => onFilterClick?.(activeFilter === 'RETOMA' ? null : 'RETOMA')}
                            className={`flex flex-col p-2.5 rounded-xl transition-colors cursor-pointer ${activeFilter === 'RETOMA' ? 'bg-orange-50 ring-1 ring-orange-200' : 'bg-slate-50 hover:bg-orange-50/50'}`}
                        >
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Inventario</span>
                            <span className="text-sm text-orange-600 font-black mt-0.5">
                                {formatCurrency(retomasTotal)}
                            </span>
                        </div>
                        <div
                            onClick={() => onFilterClick?.(activeFilter === 'NOTA_CREDITO' ? null : 'NOTA_CREDITO')}
                            className={`flex flex-col p-2.5 rounded-xl transition-colors cursor-pointer ${activeFilter === 'NOTA_CREDITO' ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-slate-50 hover:bg-rose-50/50'}`}
                        >
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Déficit</span>
                            <span className="text-sm text-rose-600 font-black mt-0.5">
                                - {formatCurrency(garantiasTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
