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
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                    Cuadre de Cuentas
                </h1>
                <p className="text-slate-500 font-medium">Panel de Conciliación</p>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Total Clientes</div>
                        <div className="text-2xl font-black text-slate-800">{formatCurrency(totalDebt)}</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
                        <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonos Hoy</div>
                        <div className="text-2xl font-black text-slate-800">{formatCurrency(paymentsToday)}</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes por Conciliar</div>
                        <div className="text-2xl font-black text-slate-800">{pendingToReconcile} doc{pendingToReconcile !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            </div>

            {/* Recent Clients */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Clientes Recientes con Saldo</h3>

                {recentCustomers.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 italic">
                        No hay clientes recientes para mostrar. Usa el buscador de arriba.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recentCustomers.map((customer) => (
                            <Link
                                href={`/finance/reconciliation?clientId=${customer.id}`}
                                key={customer.id}
                                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800 truncate text-sm">{customer.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono truncate">{customer.taxId || "Sin NIT"}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo</span>
                                        <span className={`text-sm font-black ${customer.creditBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {formatCurrency(Number(customer.creditBalance))}
                                        </span>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
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
