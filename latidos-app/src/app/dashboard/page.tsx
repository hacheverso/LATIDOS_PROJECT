
import { prisma } from "@/lib/prisma";
import {
    DollarSign,
    Package,
    AlertTriangle,
    TrendingUp,
    BarChart3
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // Parallel Fetching for Performance
    const [products, totalInstances, totalValueAgg] = await Promise.all([
        prisma.product.findMany({
            include: { instances: true }
        }),
        prisma.instance.count({
            where: { status: "IN_STOCK" }
        }),
        prisma.instance.aggregate({
            _sum: { cost: true },
            where: { status: "IN_STOCK" }
        })
    ]);

    // Metrics Calculation
    const totalValue = Number(totalValueAgg._sum.cost || 0);
    const lowStockProducts = products.filter(p => {
        const stock = p.instances.filter(i => i.status === "IN_STOCK").length;
        return stock <= 5;
    });

    // Mock Trend Data (since we don't have historical snapshots yet, just visualizing current categories)
    const categoryDistribution = products.reduce((acc, p) => {
        const cat = p.category || "Sin Categoría";
        acc[cat] = (acc[cat] || 0) + p.instances.filter(i => i.status === "IN_STOCK").length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    Panel de Control
                </h1>
                <p className="text-slate-500 font-medium">Visión General del Inventario</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Value */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Inventario</p>
                        <p className="text-2xl font-black text-slate-900">
                            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Total Units */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <Package className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Unidades</p>
                        <p className="text-2xl font-black text-slate-900">
                            {totalInstances}
                        </p>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Bajo</p>
                        <p className="text-2xl font-black text-slate-900">
                            {lowStockProducts.length} <span className="text-sm font-bold text-slate-400">Productos</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Simplified Chart / Distribution */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        Distribución de Stock por Categoría
                    </h3>
                </div>

                <div className="space-y-4">
                    {Object.entries(categoryDistribution).length === 0 ? (
                        <p className="text-center text-slate-400 text-sm italic py-8">No hay datos suficientes.</p>
                    ) : (
                        Object.entries(categoryDistribution).map(([category, count]) => (
                            <div key={category} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span className="text-slate-600">{category}</span>
                                    <span className="text-slate-900">{count} Unid.</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                        style={{ width: `${(count / totalInstances) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Low Stock Table Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-red-50/30">
                    <h3 className="font-bold text-red-700 uppercase text-sm tracking-wide">
                        ⚠️ Alertas de Reabastecimiento
                    </h3>
                </div>
                {lowStockProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        ¡Todo en orden! No hay productos con stock crítico.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="text-slate-400 uppercase font-bold bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">SKU</th>
                                    <th className="px-6 py-3 text-right">Stock Actual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lowStockProducts.map(p => {
                                    const stock = p.instances.filter(i => i.status === "IN_STOCK").length;
                                    return (
                                        <tr key={p.id}>
                                            <td className="px-6 py-3 font-bold text-slate-700">{p.name}</td>
                                            <td className="px-6 py-3 font-mono text-slate-500">{p.sku}</td>
                                            <td className="px-6 py-3 text-right font-black text-red-600">{stock}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
