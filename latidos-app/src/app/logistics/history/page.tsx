import { getLogisticsHistory, getLogisticsKPIs } from "../actions";
import HistoryStats from "./components/HistoryStats";
import HistoryTable from "./components/HistoryTable";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LogisticsHistoryPage() {
    const history = await getLogisticsHistory();
    const stats = await getLogisticsKPIs();

    return (
        <div className="min-h-screen bg-slate-50/50 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                        <History className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Logística</h1>
                        <p className="text-slate-500 text-sm">Resumen de operaciones y auditoría de entregas.</p>
                    </div>
                </div>

                {/* KPI & Stats Section */}
                <HistoryStats stats={stats} />

                {/* Master Table */}
                <HistoryTable initialData={history} />

            </div>
        </div>
    );
}
