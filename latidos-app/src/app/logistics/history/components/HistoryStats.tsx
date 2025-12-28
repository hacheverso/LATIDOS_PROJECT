"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Timer, CheckCircle, BarChart as BarChartIcon, Trophy } from "lucide-react";
// Recharts imports for the ranking chart
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface HistoryStatsProps {
    stats: {
        totalThisMonth: number;
        totalLastMonth: number;
        driverRanking: { name: string; count: number }[];
        avgTime: number; // minutes
        highUrgencyCount: number;
    };
}

export default function HistoryStats({ stats }: HistoryStatsProps) {
    const growth = stats.totalLastMonth === 0 ? 100 : Math.round(((stats.totalThisMonth - stats.totalLastMonth) / stats.totalLastMonth) * 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

            {/* 1. Success Counter */}
            <Card className="shadow-sm border-slate-100">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Entregas del Mes</p>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalThisMonth}</h3>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${growth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {growth > 0 ? "+" : ""}{growth}%
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-400">
                        <CheckCircle className="w-3 h-3" />
                        vs. {stats.totalLastMonth} el mes anterior
                    </div>
                </CardContent>
            </Card>

            {/* 2. Driver Ranking (Chart) */}
            <Card className="shadow-sm border-slate-100 md:col-span-1">
                <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> Top Domiciliarios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.driverRanking} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={80}
                                tick={{ fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={10}>
                                {stats.driverRanking.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? "#f59e0b" : "#6366f1"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Average Delivery Time */}
            <Card className="shadow-sm border-slate-100">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tiempo Promedio</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                            {Math.floor(stats.avgTime / 60)}<span className="text-sm text-slate-400 font-normal">h</span>
                            {stats.avgTime % 60}<span className="text-sm text-slate-400 font-normal">m</span>
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-400">
                        <Timer className="w-3 h-3" />
                        Desde 'En Ruta' hasta 'Finalizado'
                    </div>
                </CardContent>
            </Card>

            {/* 4. High Priority Effectiveness */}
            <Card className="shadow-sm border-slate-100">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prioridad Alta/Crit.</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.highUrgencyCount}</h3>
                        <span className="text-xs text-slate-500">Misiones Críticas Completadas</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: '80%' }}></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
