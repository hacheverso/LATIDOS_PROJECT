import { getSales, getSalesIntelligenceMetrics } from "./actions";
import SalesTable from "./SalesTable";
import { SalesIntelligenceCards } from "./components/SalesIntelligenceCards";
import Link from "next/link";
import { Plus } from "lucide-react";
import { subDays, startOfDay, endOfDay, startOfYear } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function SalesHistoryPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    // Parse Date Filters from URL
    // Default to start of year if not provided so imported debts are visible
    const startDate = searchParams.startDate ? new Date(searchParams.startDate as string) : startOfYear(new Date());
    const endDate = searchParams.endDate ? new Date(searchParams.endDate as string) : endOfDay(new Date());
    const search = searchParams.search as string;
    const status = searchParams.status as string;

    const sales = await getSales({ startDate, endDate, search, status });
    const metrics = await getSalesIntelligenceMetrics({ startDate, endDate });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-[#0B0D0F] dark:to-[#131517] p-8 space-y-8 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-2">
                        Control Financiero <span className="text-blue-600 dark:text-blue-500">.</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Tablero de ventas, recaudos y cuentas por cobrar.
                    </p>
                </div>

                <Link
                    href="/sales/new"
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Factura
                </Link>
            </div>

            {/* Intelligence Cards */}
            <SalesIntelligenceCards metrics={metrics} />

            {/* Dashboard (Table + Metrics) */}
            <SalesTable initialSales={sales as any} />
        </div>
    );
}
