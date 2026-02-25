"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar, Search } from "lucide-react";

export default function ReconciliationFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [from, setFrom] = useState(searchParams.get("from") || "");
    const [to, setTo] = useState(searchParams.get("to") || "");

    const handleApply = () => {
        const params = new URLSearchParams(searchParams);
        if (from) params.set("from", from);
        else params.delete("from");

        if (to) params.set("to", to);
        else params.delete("to");

        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#1A1C1E] rounded-xl border border-slate-100 dark:border-white/10 w-full sm:w-auto transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2 transition-colors">Desde</span>
                <input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none w-full sm:w-auto transition-colors"
                />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#1A1C1E] rounded-xl border border-slate-100 dark:border-white/10 w-full sm:w-auto transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2 transition-colors">Hasta</span>
                <input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none w-full sm:w-auto transition-colors"
                />
            </div>
            <button
                onClick={handleApply}
                className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors w-full sm:w-auto flex justify-center"
                title="Aplicar Filtros"
            >
                <Search className="w-4 h-4" />
            </button>
        </div>
    );
}
