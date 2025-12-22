
import Link from "next/link";
import { getDashboardMetrics } from "@/app/inventory/actions";
import { ArrowRight, BarChart3, Box, Package, Plus, ScanBarcode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Centro de Control <span className="text-blue-600">LATIDOS</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 text-lg">
              Resumen ejecutivo y operaciones diarias.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm text-sm font-bold text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sistema Operativo
            </div>
          </div>
        </header>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inventory Value Card */}
          <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-24 h-24 text-blue-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Valor de Inventario</h3>
              </div>
              <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {formatCurrency(metrics.inventoryValue)}
              </p>
              <p className="text-slate-400 text-sm font-bold mt-2">
                Costo total en bodega
              </p>
            </div>
          </div>

          {/* Total Units Card */}
          <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-purple-200 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Box className="w-24 h-24 text-purple-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-purple-600">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Unidades Activas</h3>
              </div>
              <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {metrics.totalUnits}
              </p>
              <p className="text-slate-400 text-sm font-bold mt-2">
                Items físicos disponibles
              </p>
            </div>
          </div>

          {/* Total References Card */}
          <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-amber-200 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-24 h-24 text-amber-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-amber-600">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Referencias</h3>
              </div>
              <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {metrics.totalProducts}
              </p>
              <p className="text-slate-400 text-sm font-bold mt-2">
                SKUs registrados
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-slate-400" />
            Accesos Rápidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/inventory/inbound" className="group">
              <div className="h-full bg-blue-600 hover:bg-blue-700 text-white rounded-3xl p-8 shadow-lg shadow-blue-500/30 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-6 opacity-20 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
                  <ScanBarcode className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                    <ScanBarcode className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Recepción</h3>
                  <p className="font-medium text-blue-100">Ingreso de mercancía, compras y etiquetado.</p>
                </div>
              </div>
            </Link>

            <Link href="/inventory" className="group">
              <div className="h-full bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-600 group-hover:text-blue-600 transition-colors">
                    <Box className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Inventario</h3>
                  <p className="font-bold text-slate-500">Gestión de existencias, filtros y movimientos.</p>
                </div>
              </div>
            </Link>

            <Link href="/inventory/new" className="group">
              <div className="h-full bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-600 group-hover:text-amber-600 transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Producto Maestro</h3>
                  <p className="font-bold text-slate-500">Creación de nuevas referencias y SKUs.</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
