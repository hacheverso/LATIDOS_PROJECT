"use client";

import { Search, DollarSign, CalendarCheck, Clock, User, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
// ClientWrapper is no longer needed here since it's in the header

interface ReconciliationDashboardProps {
    recentCustomers?: any[];
    metrics?: {
        totalDebt: number;
        paymentsToday: number;
        pendingToReconcile: number;
    }
}

export default function ReconciliationDashboard({ recentCustomers = [], metrics }: ReconciliationDashboardProps) {
    // Fallbacks just in case
    const totalDebt = metrics?.totalDebt || 0;
    const paymentsToday = metrics?.paymentsToday || 0;
    const pendingToReconcile = metrics?.pendingToReconcile || 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter transition-colors">
                    Cuadre de Cuentas
                </h1>
                <p className="text-slate-500 font-medium transition-colors">Panel de Conciliación</p>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1A1C1E] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-500 dark:text-rose-400 transition-colors">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Deuda Total Clientes</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white transition-colors">{formatCurrency(totalDebt)}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1A1C1E] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500 dark:text-emerald-400 transition-colors">
                        <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Abonos Hoy</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white transition-colors">{formatCurrency(paymentsToday)}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1A1C1E] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500 dark:text-blue-400 transition-colors">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Pendientes por Conciliar</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white transition-colors">{pendingToReconcile} doc{pendingToReconcile !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            </div>

            {/* Recent Clients */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 transition-colors">Clientes Recientes con Saldo</h3>

                {recentCustomers.length === 0 ? (
                    <div className="bg-white dark:bg-[#1A1C1E] p-8 rounded-2xl border border-slate-100 dark:border-white/10 text-center text-slate-400 dark:text-slate-500 italic transition-colors">
                        No hay clientes recientes para mostrar. Usa el buscador de arriba.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recentCustomers.map((customer) => (
                            <Link
                                href={`/finance/reconciliation?clientId=${customer.id}`}
                                key={customer.id}
                                className="bg-white dark:bg-[#1A1C1E] p-4 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0 transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm transition-colors">{customer.name}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate transition-colors">{customer.taxId || "Sin NIT"}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 dark:border-white/5 pt-3 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase transition-colors">Saldo</span>
                                        <span className={`text-sm font-black transition-colors ${customer.creditBalance > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {formatCurrency(Number(customer.creditBalance))}
                                        </span>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-500/20 group-hover:text-white dark:group-hover:text-indigo-400 transition-colors">
                                        <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
