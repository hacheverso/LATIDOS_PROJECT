"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

interface DashboardChartsProps {
    categoryData: { name: string; value: number; color: string }[];
    historyData: { date: string; value: number; sales: number; isPeak: boolean }[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(value);
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-[#131517]/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-border text-xs">
                <p className="font-bold text-slate-700 dark:text-[#E0F7FA] mb-2 uppercase tracking-wider">{label}</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                        <span className="text-muted">Inventario:</span>
                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(payload[0].value)}</span>
                    </div>
                    {payload[1] && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            <span className="text-muted">Ventas:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(payload[1].value)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

import { ComposedChart, Line } from "recharts";

export function DashboardCharts({ categoryData, historyData }: DashboardChartsProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const tickColor = isDark ? "#F5F5F5" : "#94a3b8";
    const gridColor = isDark ? "#ffffff10" : "#e2e8f0";
    const tooltipBg = isDark ? "rgba(19, 21, 23, 0.9)" : "rgba(255, 255, 255, 0.9)";
    const tooltipColor = isDark ? "#E0F7FA" : "#334155";
    const legendColor = isDark ? "#F5F5F5" : "#94a3b8";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Pie Chart: Composition */}
            <Card className="shadow-lg border-slate-100/50 dark:border-white/10 bg-white/50 dark:bg-[#1A1C1E]/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-500 dark:text-[#E0F7FA] uppercase tracking-widest">
                        VALOR TOTAL POR CATEGORÍA
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: any) => formatCurrency(Number(value))}
                                    contentStyle={{
                                        backgroundColor: tooltipBg,
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                    itemStyle={{ color: tooltipColor, fontWeight: "bold", fontSize: "12px" }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: legendColor }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Composed Chart: History */}
            <Card className="shadow-lg border-slate-100/50 dark:border-white/10 bg-white/50 dark:bg-[#1A1C1E]/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-500 dark:text-[#E0F7FA] uppercase tracking-widest">
                        HISTORIAL DE VALOR DEL INVENTARIO (MENSUAL)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={historyData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: tickColor, fontSize: 10, fontWeight: "bold" }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: tickColor, fontSize: 10, fontWeight: "bold" }}
                                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />

                                {/* Inventory Area */}
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    activeDot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (payload.isPeak) {
                                            return (
                                                <circle cx={cx} cy={cy} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={2}>
                                                    <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
                                                </circle>
                                            );
                                        }
                                        return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
                                    }}
                                />

                                {/* Sales Line */}
                                <Line
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#10b981" // Emerald
                                    strokeWidth={2}
                                    dot={false}
                                    strokeDasharray="5 5"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
