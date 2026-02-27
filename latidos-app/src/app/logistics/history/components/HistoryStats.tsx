
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, Bike, Store, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface HistoryStatsProps {
    stats: {
        totalDeliveries: number;
        totalPickups: number;
        avgTime: number; // minutes
        driverRanking: { name: string; count: number }[];
        topOperators: { name: string; count: number }[];
    };
    currentFilters: {
        range: string;
        from?: string;
        to?: string;
    };
}

export default function HistoryStats({ stats, currentFilters }: HistoryStatsProps) {
    const router = useRouter();
    const [date, setDate] = useState<DateRange | undefined>(
        currentFilters.from && currentFilters.to
            ? { from: new Date(currentFilters.from), to: new Date(currentFilters.to) }
            : undefined
    );

    const setFilter = (range: string, from?: Date, to?: Date) => {
        const params = new URLSearchParams();
        params.set("range", range);
        if (from) params.set("from", from.toISOString());
        if (to) params.set("to", to.toISOString());
        router.push(`?${params.toString()}`);
    };

    const handleRankeSelect = (range: DateRange | undefined) => {
        setDate(range);
        if (range?.from && range?.to) {
            setFilter("CUSTOM", range.from, range.to);
        }
    };

    return (
        <div className="space-y-6 mb-8">
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row justify-end items-center gap-2">
                <div className="bg-background p-1 rounded-lg border border-border shadow-sm flex items-center gap-1 overflow-x-auto max-w-full transition-colors">
                    <Button
                        variant={currentFilters.range === "TODAY" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("TODAY")}
                        className={`text-xs h-8 ${currentFilters.range === "TODAY" ? "bg-slate-100 dark:bg-white/10 text-foreground font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                    >
                        Hoy
                    </Button>
                    <Button
                        variant={currentFilters.range === "7D" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("7D")}
                        className={`text-xs h-8 ${currentFilters.range === "7D" ? "bg-slate-100 dark:bg-white/10 text-foreground font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                    >
                        7 Días
                    </Button>
                    <Button
                        variant={currentFilters.range === "30D" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("30D")}
                        className={`text-xs h-8 ${currentFilters.range === "30D" ? "bg-slate-100 dark:bg-white/10 text-foreground font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                    >
                        Mes
                    </Button>
                    <Button
                        variant={currentFilters.range === "YEAR" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("YEAR")}
                        className={`text-xs h-8 ${currentFilters.range === "YEAR" ? "bg-slate-100 dark:bg-white/10 text-foreground font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                    >
                        Este Año
                    </Button>
                </div>

                <div className="bg-background p-1 rounded-lg border border-border shadow-sm transition-colors">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"ghost"} // Changed to ghost to handle custom styling
                                size="sm"
                                className={`text-xs h-8 justify-start text-left font-normal ${currentFilters.range === "CUSTOM" ? "bg-slate-100 dark:bg-white/10 text-foreground font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                            {format(date.to, "LLL dd, y", { locale: es })}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y", { locale: es })
                                    )
                                ) : (
                                    <span>Personalizado</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background border-border shadow-xl" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={handleRankeSelect}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* HUD Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Entregas (Domicilios) */}
                <Card className="shadow-sm bg-surface border-border border-l-4 border-l-blue-500 overflow-hidden relative transition-colors">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Domicilios</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.totalDeliveries}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                <Bike className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        {/* Driver Micro-Ranking */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-border">
                            <p className="text-[10px] font-bold text-muted uppercase">Top Domiciliarios</p>
                            {stats.driverRanking.length > 0 ? (
                                stats.driverRanking.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-muted truncate max-w-[120px]">{d.name}</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{d.count}</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-muted italic">Sin datos</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Recogidas (Oficina) */}
                <Card className="shadow-sm bg-surface border-border border-l-4 border-l-emerald-500 overflow-hidden relative transition-colors">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Recogidas en Oficina</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.totalPickups}</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        {/* Operator Micro-Ranking */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-border">
                            <p className="text-[10px] font-bold text-muted uppercase">Top Operadores</p>
                            {stats.topOperators.length > 0 ? (
                                stats.topOperators.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-1">
                                            {i === 0 && <Trophy className="w-3 h-3 text-amber-500" />}
                                            <span className="text-muted truncate max-w-[120px]">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-white">{d.count}</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-muted italic">Sin datos</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Avg Time */}
                <Card className="shadow-sm bg-surface border-border border-l-4 border-l-purple-500 overflow-hidden relative transition-colors">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Tiempo Promedio</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter flex items-baseline gap-1">
                                    {Math.floor(stats.avgTime / 60)}<span className="text-lg font-bold text-muted">h</span>
                                    {stats.avgTime % 60}<span className="text-lg font-bold text-muted">m</span>
                                </h3>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                                <Timer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs text-muted leading-relaxed">
                                Promedio calculado desde el momento en que un pedido sale "En Ruta" hasta que es "Finalizado" (Entregado).
                            </p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
