"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardChartsProps {
    categoryData: { name: string; value: number; color: string }[];
    historyData: { date: string; value: number }[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(value);
};

export function DashboardCharts({ categoryData, historyData }: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Pie Chart: Composition */}
            <Card className="shadow-lg border-slate-100/50 bg-white/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Composición del Valor
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
                                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                    itemStyle={{ color: "#334155", fontWeight: "bold", fontSize: "12px" }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#94a3b8" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Area Chart: History */}
            <Card className="shadow-lg border-slate-100/50 bg-white/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Valor en el Tiempo (30 días)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={historyData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                                />
                                <RechartsTooltip
                                    formatter={(value: any) => [formatCurrency(Number(value)), "Valor"]}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                    labelStyle={{ color: "#64748b", fontSize: "10px", marginBottom: "4px" }}
                                    itemStyle={{ color: "#2563eb", fontWeight: "bold", fontSize: "12px" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
