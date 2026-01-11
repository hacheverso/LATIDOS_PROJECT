"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar, Search } from "lucide-react";

export default function DateRangeFilter() {
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
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none w-auto"
                />
                <span className="text-slate-300 mx-1">/</span>
                <input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none w-auto"
                />
            </div>
            <button
                onClick={handleApply}
                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Filtrar"
            >
                <Search className="w-4 h-4" />
            </button>
        </div>
    );
}
