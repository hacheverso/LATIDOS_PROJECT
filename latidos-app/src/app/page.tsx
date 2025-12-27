import { getExecutiveMetrics } from "./actions";
import { KPIHeader } from "@/components/dashboard/KPIHeader";
import { DashboardCharts } from "@/components/dashboard/Charts";
import { QuickActions, CriticalSection } from "@/components/dashboard/OperationalWidgets";
import { Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getExecutiveMetrics();

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Centro de Control <span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Resumen Ejecutivo & Operaciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">Sistema Conectado</span>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 1. Master KPIs */}
      <KPIHeader metrics={metrics} />

      {/* 2. Visualization Blocks */}
      <DashboardCharts weeklySales={metrics.weeklySales} debtBuckets={metrics.debtBuckets} />

      {/* 3. Operational Layer */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 mb-4 px-2">Accesos Rápidos</h3>
          <QuickActions />
        </div>
      </div>

      {/* 4. Critical & Strategic Layer */}
      <CriticalSection alerts={metrics.criticalAlerts} topClient={metrics.topClient} />

    </div>
  );
}
