
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
            <div className="hidden md:flex gap-6 bg-slate-50 dark:bg-[#1A1C1E] px-4 py-2 rounded-lg border border-slate-100 dark:border-white/5 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 rounded-md">
                        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Creadas Hoy</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{stats.createdToday}</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-500/10 rounded-md">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completadas</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{stats.completedToday}</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-500/10 rounded-md">
                        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pendientes</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{stats.activePending}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
