"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react";

interface CommandDockProps {
    onIncome: () => void;
    onExpense: () => void;
    onTransfer: () => void;
}

export function CommandDock({ onIncome, onExpense, onTransfer }: CommandDockProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-1 p-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">

                <button
                    onClick={onIncome}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-emerald-500/10 transition-all active:scale-95"
                >
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        <ArrowDown className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-emerald-100 hidden sm:inline">Ingreso</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={onExpense}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-rose-500/10 transition-all active:scale-95"
                >
                    <span className="p-1 rounded-full bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <ArrowUp className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-rose-100 hidden sm:inline">Egreso</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={onTransfer}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-indigo-500/10 transition-all active:scale-95"
                >
                    <span className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <ArrowRightLeft className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-indigo-100 hidden sm:inline">Transferir</span>
                </button>

            </div>
        </div>
    );
}
