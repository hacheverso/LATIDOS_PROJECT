import { getSales, getSalesIntelligenceMetrics } from "./actions";
import SalesTable from "./SalesTable";
import { SalesIntelligenceCards } from "./components/SalesIntelligenceCards";
import Link from "next/link";
import { Plus } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function SalesHistoryPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    // Parse Date Filters from URL
    // Default to last 7 days if not provided
    const startDate = searchParams.startDate ? new Date(searchParams.startDate as string) : subDays(startOfDay(new Date()), 7);
    const endDate = searchParams.endDate ? new Date(searchParams.endDate as string) : endOfDay(new Date());
    const search = searchParams.search as string;
    const status = searchParams.status as string;

    const sales = await getSales({ startDate, endDate, search, status });
    const metrics = await getSalesIntelligenceMetrics({ startDate, endDate });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                        Control Financiero <span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Tablero de ventas, recaudos y cuentas por cobrar.
                    </p>
                </div>

                <Link
                    href="/sales/new"
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
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
