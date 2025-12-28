
import { Activity, CheckCircle2, Clock } from "lucide-react";

interface DailySummaryProps {
    stats: {
        createdToday: number;
        completedToday: number;
        activePending: number;
    };
}

export default function DailySummary({ stats }: DailySummaryProps) {
    return (
        <div className="flex items-center gap-4 mr-4">
            <div className="hidden md:flex gap-6 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                        <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creadas Hoy</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{stats.createdToday}</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200" />

                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-md">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completadas</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{stats.completedToday}</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200" />

                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 rounded-md">
                        <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{stats.activePending}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
