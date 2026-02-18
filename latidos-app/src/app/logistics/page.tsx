import { getLogisticsBoard, getLogisticsDailyStats } from "./actions";
import { auth } from "@/auth";
import LogisticsBoard from "./components/LogisticsBoard";
import DailySummary from "./components/DailySummary";
import { Users, Truck } from "lucide-react";
import CreateTaskModal from "./components/CreateTaskModal";

export default async function LogisticsPage() {
    const session = await auth();
    const data = await getLogisticsBoard();
    const stats = await getLogisticsDailyStats();

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-20">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                Logística & Entregas
                            </h1>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-11">
                            Gestión de Rutas
                        </p>
                    </div>
                </div>

                <div className="flex items-center">
                    <DailySummary stats={stats} />

                    {/* Actions */}
                    <div className="flex gap-2 pl-4 border-l border-slate-100">
                        <CreateTaskModal />
                    </div>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 bg-slate-50/50 overflow-hidden relative">
                <div className="absolute inset-0 overflow-x-auto">
                    {/* @ts-ignore */}
                    <LogisticsBoard initialData={data} currentUserId={session?.user?.id} currentUserRole={session?.user?.role} />
                </div>
            </div>
        </div>
    );
}
