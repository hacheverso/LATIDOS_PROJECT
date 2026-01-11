"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface ProjectionChartProps {
    data: {
        name: string;
        amount: number;
        fill: string;
    }[];
}

export default function ProjectionChart({ data }: ProjectionChartProps) {
    const totalProjected = data.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <Card className="border-slate-200 shadow-sm col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Proyección de Recaudo
                </CardTitle>
                <CardDescription>Flujo de caja esperado (Vencimiento +30 días)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                hide
                            />
                            <Tooltip
                                formatter={(value: any) => [formatCurrency(value), "Monto"]}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Esperado</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(totalProjected)}</span>
                </div>
            </CardContent>
        </Card>
    );
}
