"use client";

import { Search, DollarSign, CalendarCheck, Clock, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ClientWrapper from "./ClientWrapper";

export default function ReconciliationDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                    Cuadre de Cuentas
                </h1>
                <p className="text-slate-500 font-medium">Panel de Conciliación</p>
            </div>

            {/* Top KPIs (Mocked for now, can be wired up later) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Total Clientes</div>
                        {/* Placeholder Value */}
                        <div className="text-2xl font-black text-slate-800">$ --</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
                        <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonos Hoy</div>
                        <div className="text-2xl font-black text-slate-800">$ 0</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.02)] flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes por Conciliar</div>
                        <div className="text-2xl font-black text-slate-800">--</div>
                    </div>
                </div>
            </div>

            {/* Central Search Area */}
            <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
                <div>
                    <h2 className="text-2xl font-bold mb-2">¿A quién vamos a conciliar hoy?</h2>
                    <p className="text-slate-400">Selecciona un cliente para ver su estado de cuenta, registrar abonos y conciliar facturas.</p>
                </div>

                <div className="w-full bg-white rounded-xl p-1 text-slate-900">
                    <ClientWrapper />
                </div>
            </div>

            {/* Recent Clients (Mock / Placeholder) */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Clientes Recientes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Placeholder Logic: This would ideal come from localStorage or Recent Queries */}
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="h-2 bg-slate-100 w-20 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
