
import { getCollectionsData } from "../actions";
import { AlertCircle, CalendarClock, DollarSign, Wallet, Users, Search, Filter, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
    const data = await getCollectionsData();

    // Metrics Logic
    const totalOverdue = data.reduce((acc, curr) => acc + curr.balance, 0);
    const criticalDebt = data.filter(d => d.status === 'RED').reduce((acc, curr) => acc + curr.balance, 0);
    const warningDebt = data.filter(d => d.status === 'ORANGE').reduce((acc, curr) => acc + curr.balance, 0);

    // Upcoming: This logic in "getCollections" was filtering only positive balance. 
    // "Upcoming" generally means invoices that are not yet overdue but have balance? 
    // The current logic classifies everything based on Age. 
    // 0-11 days = Green (Clean Debt)
    // 12-14 days = Orange (Warning)
    // >15 days = Red (Critical)
    const healthyDebt = data.filter(d => d.status === 'GREEN').reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-600" />
                    Gestión de Cobranzas
                </h1>
                <p className="text-slate-500 font-medium ml-11">Control de cartera y semáforo de deuda.</p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Portfolio */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Cartera Total</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 tracking-tight">
                            ${totalOverdue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-1">
                            {data.length} facturas pendientes
                        </div>
                    </div>
                </div>

                {/* Critical Debt (Red) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-10 -mt-10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Mora Crítica (&gt;15 días)</span>
                        </div>
                        <div className="text-3xl font-black text-red-600 tracking-tight">
                            ${criticalDebt.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-400 font-bold mt-1 bg-red-50 inline-block px-2 py-0.5 rounded">
                            Bloqueo de Ventas Activo
                        </div>
                    </div>
                </div>

                {/* Healthy Debt (Green) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                            <CalendarClock className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Deuda Limpia (0-11 días)</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-600 tracking-tight">
                            ${healthyDebt.toLocaleString()}
                        </div>
                        <div className="text-xs text-emerald-500 font-medium mt-1">
                            Recaudo normal esperado
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" /> Detalle de Clientes
                    </h2>

                    {/* Placeholder Filters (Client-side filtering could be added here similar to SalesTable) */}
                    <div className="flex gap-2 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Al día</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Advertencia</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Bloqueado</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Factura</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4 text-center">Antigüedad</th>
                                <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                            {data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className={`w-3 h-3 rounded-full shadow-sm ${item.status === 'RED' ? 'bg-red-500 shadow-red-500/50 animate-pulse' :
                                            item.status === 'ORANGE' ? 'bg-orange-500' : 'bg-emerald-500'
                                            }`} />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        #{item.invoiceNumber || item.id.slice(0, 8).toUpperCase()}
                                        <div className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{item.customerName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{item.customerTaxId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="secondary" className={`border-0 ${item.status === 'RED' ? 'bg-red-100 text-red-700' :
                                            item.status === 'ORANGE' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {item.daysOld} días
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800">
                                            ${item.balance.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {/* Action Button for future: Register Payment */}
                                        <button className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                            Abonar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                                        No hay facturas pendientes de cobro. ¡Excelente gestión!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
