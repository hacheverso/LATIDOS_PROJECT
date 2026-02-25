"use client";

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import { useTheme } from "next-themes";

const COLORS = ["#3b82f6", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b"];

export function WeeklySalesChart({ data }: { data: any[] }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const tickColor = isDark ? "#F5F5F5" : "#64748b";
    const gridColor = isDark ? "#ffffff10" : "#f1f5f9";
    const tooltipBg = isDark ? "#131517" : "#ffffff";
    const tooltipColor = isDark ? "#F5F5F5" : "#0f172a";

    if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-slate-400 dark:text-[#E0F7FA]">Sin datos</div>;

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 12 }}
                        tickFormatter={(value) =>
                            new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                notation: "compact",
                                compactDisplay: "short",
                                maximumFractionDigits: 1
                            }).format(value)
                        }
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: tooltipBg, color: tooltipColor }}
                        itemStyle={{ color: tooltipColor }}
                        cursor={{ fill: gridColor }}
                        formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, "Ventas"]}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function TopCategoriesChart({ data }: { data: any[] }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const tooltipBg = isDark ? "#131517" : "#ffffff";
    const tooltipColor = isDark ? "#F5F5F5" : "#0f172a";

    if (data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-slate-400 dark:text-[#E0F7FA] italic">No hay datos de ventas recientes.</div>;
    }

    return (
        <div className="h-[340px] w-full flex flex-col justify-between">
            {/* Increased Container Height & Flex layout to prevent clipping */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70} // Adjusted radius
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: tooltipBg, color: tooltipColor }}
                            itemStyle={{ color: tooltipColor }}
                            formatter={(value: any) => [`${value} Unid.`, "Vendidos"]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend outside Chart */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pb-2 mt-2 px-2">
                {data.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-[#E0F7FA] uppercase tracking-wide truncate max-w-[100px]" title={entry.name}>
                            {entry.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
