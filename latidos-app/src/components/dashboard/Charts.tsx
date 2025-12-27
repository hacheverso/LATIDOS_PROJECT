"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ChartsProps {
    weeklySales: { date: string, amount: number }[];
    debtBuckets: { [key: string]: number };
}

export function DashboardCharts({ weeklySales, debtBuckets }: ChartsProps) {
    const debtData = Object.entries(debtBuckets).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);
    const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']; // Green to Red

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Sales */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Ritmo de Ventas</h3>
                    <p className="text-sm text-slate-400">Comportamiento diario (últimos 7 días)</p>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklySales}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Ventas']}
                            />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {weeklySales.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Debt Aging */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                <div className="mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Salud de Cartera</h3>
                    <p className="text-sm text-slate-400">Antigüedad de deuda</p>
                </div>
                <div className="h-64 w-full relative">
                    {debtData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={debtData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {debtData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
                            Sin deuda pendiente.
                        </div>
                    )}
                    {/* Legend */}
                    <div className="flex justify-center flex-wrap gap-2 mt-4">
                        {debtData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {entry.name} días
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
