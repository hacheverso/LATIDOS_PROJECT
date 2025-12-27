import Link from "next/link";
import { Plus, ShoppingCart, Truck, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActions() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/sales" className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 group">
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Nueva Venta</span>
            </Link>
            <Link href="/sales?status=PENDING" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:border-blue-300 group">
                <ShoppingCart className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="font-bold text-sm">Cobranza</span>
            </Link>
            <Link href="/inventory/inbound" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:border-purple-300 group">
                <Truck className="w-6 h-6 text-slate-400 group-hover:text-purple-500 transition-colors" />
                <span className="font-bold text-sm">Ingreso M/cía</span>
            </Link>
        </div>
    );
}

interface CriticalAlertsProps {
    alerts: {
        stock: string[];
        debt: { client: string, days: number, amount: number }[];
    };
    topClient: { name: string, total: number } | null;
}

export function CriticalSection({ alerts, topClient }: CriticalAlertsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Alerts */}
            <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Atención Requerida
                </h3>
                <div className="space-y-3">
                    {/* Stock Alerts */}
                    {alerts.stock.map((prod, i) => (
                        <div key={`stock-${i}`} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                            <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">Producto Agotado</p>
                                <p className="text-xs text-slate-600 truncate">{prod}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-white text-red-600 px-2 py-1 rounded-md border border-red-100">Stock 0</span>
                        </div>
                    ))}
                    {/* Debt Alerts */}
                    {alerts.debt.map((d, i) => (
                        <div key={`debt-${i}`} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">Mora Crítica ({d.days} días)</p>
                                <p className="text-xs text-slate-600 truncate">{d.client}</p>
                            </div>
                            <span className="text-xs font-bold text-orange-700">
                                ${d.amount.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {alerts.stock.length === 0 && alerts.debt.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            Todo en orden. No hay alertas críticas.
                        </div>
                    )}
                </div>
            </div>

            {/* VIP Client & Traffic Light */}
            <div className="space-y-6">
                {/* Traffic Light (Mock for now, could be improved with target logic) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2">Semáforo del Día</h3>
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-transparent" />
                        <div className="w-10 h-10 rounded-full bg-green-500 border-4 border-white shadow-lg shadow-green-200 animate-pulse" />
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-transparent" />
                    </div>
                    <p className="text-center text-xs text-green-600 font-bold mt-2">Operación Activa</p>
                </div>

                {/* VIP Client */}
                {topClient && (
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-6 rounded-3xl shadow-lg shadow-amber-200 text-white relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-white/20">
                            <ShoppingCart className="w-24 h-24" />
                        </div>
                        <h3 className="relative z-10 font-bold text-white/90 text-sm uppercase tracking-wider mb-1">Cliente VIP del Mes</h3>
                        <p className="relative z-10 text-xl font-black">{topClient.name}</p>
                        <div className="relative z-10 mt-4 pt-4 border-t border-white/20">
                            <p className="text-xs font-medium text-amber-100">Total Comprado</p>
                            <p className="text-2xl font-black">${topClient.total.toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
