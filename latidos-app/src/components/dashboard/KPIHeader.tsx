import { DollarSign, BarChart3, Wallet, TrendingUp } from "lucide-react";

interface KPIHeaderProps {
    metrics: {
        salesMonth: number;
        inventoryValue: number;
        totalDebt: number;
        moneyOnStreetPct: number;
    };
}

export function KPIHeader({ metrics }: KPIHeaderProps) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sales Month */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                        + Mes Actual
                    </span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ventas del Mes</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                        {formatCurrency(metrics.salesMonth)}
                    </p>
                </div>
            </div>

            {/* Total Debt */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">
                        Cartera
                    </span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Por Cobrar</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                        {formatCurrency(metrics.totalDebt)}
                    </p>
                </div>
            </div>

            {/* Inventory Value */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">
                        Bodega
                    </span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Valor Inventario</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                        {formatCurrency(metrics.inventoryValue)}
                    </p>
                </div>
            </div>

            {/* Money on Street / Liquidity */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg border border-slate-700 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/10 text-white rounded-2xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white/80 bg-white/10 px-2 py-1 rounded-full uppercase">
                        Liquidez
                    </span>
                </div>
                <div className="relative z-10">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">% Dinero en Calle</h3>
                    <p className="text-2xl font-black tracking-tight">
                        {isNaN(metrics.moneyOnStreetPct) ? '0%' : `${metrics.moneyOnStreetPct.toFixed(1)}%`}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Vs. Capital Total</p>
                </div>
            </div>
        </div>
    );
}
