"use client";

import { useEffect, useState } from "react";
import { getTeamPerformanceStats } from "./actions";
import { Users, Truck, Activity, Package, CheckCircle2, Navigation, AlertTriangle, ShieldCheck, ShoppingCart, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

export default function PerformanceDashboard() {
    const [data, setData] = useState<{ logistics: any[], operators: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    // Date Filter State
    const [filterPreset, setFilterPreset] = useState<"TODAY" | "7_DAYS" | "MONTH" | "YEAR" | "CUSTOM">("YEAR");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: startOfYear(new Date()),
        to: endOfDay(new Date()),
    });

    useEffect(() => {
        setLoading(true);
        getTeamPerformanceStats(dateRange.from, dateRange.to)
            .then(setData)
            .finally(() => setLoading(false));
    }, [dateRange]);

    const handlePresetChange = (preset: "TODAY" | "7_DAYS" | "MONTH" | "YEAR" | "CUSTOM") => {
        setFilterPreset(preset);
        const now = new Date();
        switch (preset) {
            case "TODAY":
                setDateRange({ from: startOfDay(now), to: endOfDay(now) });
                break;
            case "7_DAYS":
                setDateRange({ from: subDays(now, 7), to: endOfDay(now) });
                break;
            case "MONTH":
                setDateRange({ from: startOfMonth(now), to: endOfDay(now) });
                break;
            case "YEAR":
                setDateRange({ from: startOfYear(now), to: endOfDay(now) });
                break;
            // CUSTOM is handled by a date picker (simplified here)
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Rendimiento del Equipo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Estadísticas de uso de PIN (Dual ID) y KPIs de Logística.</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <Link
                        href="/directory/team"
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Users className="w-4 h-4" />
                        Volver a Miembros
                    </Link>

                    {/* Date Filters */}
                    <div className="bg-white dark:bg-[#1A1C1E] border border-slate-200 dark:border-white/10 p-1 rounded-xl shadow-sm flex flex-wrap gap-1">
                        {(["TODAY", "7_DAYS", "MONTH", "YEAR"] as const).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handlePresetChange(preset)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide",
                                    filterPreset === preset
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                {preset === "TODAY" ? "Hoy"
                                    : preset === "7_DAYS" ? "7 Días"
                                        : preset === "MONTH" ? "Mes"
                                            : "Año"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-[400px] bg-slate-100/50 rounded-3xl animate-pulse"></div>
                    <div className="h-[400px] bg-slate-100/50 rounded-3xl animate-pulse"></div>
                </div>
            ) : !data ? (
                <div className="p-12 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    Error al cargar datos.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* Left Column: Office / Dual ID Operators */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b mx-2 border-slate-200/60 dark:border-white/10 pb-3 mb-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                Gestión Operativa
                            </h2>
                            <span className="text-xs font-bold bg-emerald-100/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
                                {data.operators.length} Operadores
                            </span>
                        </div>

                        {data.operators.length === 0 ? (
                            <EmptyState message="No hay operadores registrados o no hay actividad en este periodo." icon={ShieldCheck} />
                        ) : (
                            <div className="flex flex-col gap-6">
                                {data.operators.map((op, i) => (
                                    <OperatorCard key={op.id} operator={op} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Logistics Dashboard */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b mx-2 border-slate-200/60 dark:border-white/10 pb-3 mb-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Truck className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                Rutas y Logística
                            </h2>
                            <span className="text-xs font-bold bg-amber-100/50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full">
                                {data.logistics.length} Conductores
                            </span>
                        </div>

                        {data.logistics.length === 0 ? (
                            <EmptyState message="No hay miembros de logística registrados o no hay actividad en este periodo." icon={Truck} />
                        ) : (
                            <div className="flex flex-col gap-6">
                                {data.logistics.map((log, i) => (
                                    <LogisticsCard key={log.id} user={log} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// -- Subcomponents --

function OperatorCard({ operator, rank }: { operator: any, rank: number }) {
    const isTop = rank === 1 && operator.stats.totalInteractions > 0;

    return (
        <div className={cn(
            "h-full flex flex-col bg-white dark:bg-card p-5 rounded-3xl border shadow-sm transition-all group relative overflow-hidden",
            isTop ? "border-emerald-200 dark:border-emerald-500/30 shadow-emerald-900/5 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-500/10 to-white dark:to-card" : "border-slate-100 dark:border-white/5 hover:shadow-md hover:border-slate-200 dark:hover:border-white/20"
        )}>
            {isTop && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-bl-xl shadow-sm z-10">
                    MVP Oficina
                </div>
            )}

            <div className="flex items-start gap-4 z-10 relative flex-1">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",
                    isTop ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                )}>
                    {rank}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">{operator.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 h-6">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{operator.role}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                        <StatBadge label="Ventas" value={operator.stats.salesProcessed} icon={ShoppingCart} color="text-indigo-600" />
                        <StatBadge label="Pagos" value={operator.stats.paymentsProcessed} icon={Activity} color="text-emerald-600" />
                        <StatBadge label="Compras" value={operator.stats.purchasesProcessed} icon={Package} color="text-purple-600" />
                        <StatBadge label="Ajustes/Aud." value={operator.stats.stockAdjustments + operator.stats.auditsProcessed} icon={ShieldCheck} color="text-slate-600" />
                    </div>

                    <div className="mt-auto pt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000", isTop ? "bg-emerald-400 dark:bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
                                style={{ width: `${Math.min(100, (operator.stats.totalInteractions / 100) * 100)}%` }} // Arbitrary scale factor
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-36 text-right shrink-0">{operator.stats.totalInteractions} Acciones Totales</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LogisticsCard({ user, rank }: { user: any, rank: number }) {
    const isTop = rank === 1 && user.stats.totalCompleted > 0;

    return (
        <div className={cn(
            "h-full flex flex-col bg-white dark:bg-card p-5 rounded-3xl border shadow-sm transition-all group relative overflow-hidden",
            isTop ? "border-amber-200 dark:border-amber-500/30 shadow-amber-900/5 bg-gradient-to-br from-amber-50/50 dark:from-amber-500/10 to-white dark:to-card" : "border-slate-100 dark:border-white/5 hover:shadow-md hover:border-slate-200 dark:hover:border-white/20"
        )}>
            {isTop && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-bl-xl shadow-sm z-10">
                    MVP En Ruta
                </div>
            )}

            <div className="flex items-start gap-4 z-10 relative flex-1">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",
                    isTop ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                )}>
                    {rank}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">{user.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 h-6">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.role}</span>
                        {user.stats.pendingDeliveries > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                En Ruta Ahora
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                        <StatBadge label="Entregas Exitosas" value={user.stats.completedDeliveries} icon={CheckCircle2} color="text-emerald-600" />
                        <StatBadge label="Tareas Finalizadas" value={user.stats.completedTasks} icon={CheckCircle2} color="text-emerald-600" />
                        <StatBadge label="En Progreso" value={user.stats.pendingDeliveries} icon={Navigation} color="text-amber-600 dark:text-amber-400" />
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/5 border border-slate-100 dark:border-white/5 border-dashed transition-all">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100/50 dark:bg-white/10 shadow-sm shrink-0 text-slate-300 dark:text-slate-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0 justify-center">
                                <span className="font-black text-xl leading-none text-slate-300 dark:text-slate-600">-</span>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-tight mt-1 truncate" title="Próximamente">Próximamente</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000", isTop ? "bg-amber-400 dark:bg-amber-500" : "bg-slate-300 dark:bg-slate-600")}
                                style={{ width: `${Math.min(100, (user.stats.totalCompleted / 50) * 100)}%` }} // Arbitrary scale factor
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-36 text-right shrink-0">{user.stats.totalCompleted} Puntos Totales</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


function StatBadge({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#1A1C1E]/50 border border-slate-100 dark:border-white/10 transition-all hover:bg-slate-50 dark:hover:bg-white/5">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-white/5 shadow-sm shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
                <span className={cn("font-black text-xl leading-none", color)}>{value}</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight mt-1 line-clamp-2 break-words" title={label}>{label}</span>
            </div>
        </div>
    );
}

function EmptyState({ message, icon: Icon }: { message: string, icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-[#1A1C1E] border border-slate-100 dark:border-white/5 border-dashed rounded-3xl">
            <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Icon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-[200px]">{message}</p>
        </div>
    );
}
