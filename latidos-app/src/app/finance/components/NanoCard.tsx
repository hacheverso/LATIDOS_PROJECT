"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
    Wallet,
    Landmark,
    Banknote,
    MoreVertical,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    Pencil,
    Archive,
    Trash2,
    Ticket
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NanoCardProps {
    account: {
        id: string;
        name: string;
        type: string;
        balance: number | string;
        icon?: string | null;
        currency: string;
    };
    onArchive: (id: string) => void;
    onEdit: (account: any) => void;
    onDelete: (id: string) => void;
    onRestore?: (id: string) => void;
}

const TYPE_ICONS: Record<string, any> = {
    CASH: Banknote,
    BANK: Landmark,
    WALLET: Wallet,
    RETOMA: Archive, // or RefreshCcw
    NOTA_CREDITO: Ticket,
    DEFAULT: Wallet
};

const TYPE_COLORS: Record<string, string> = {
    CASH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    BANK: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    WALLET: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    RETOMA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    NOTA_CREDITO: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export function NanoCard({ account, onArchive, onEdit, onDelete, onRestore }: NanoCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const Icon = TYPE_ICONS[account.type] || TYPE_ICONS.DEFAULT;
    const colorClass = TYPE_COLORS[account.type] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

    const balance = Number(account.balance);
    // @ts-ignore
    const isArchived = account.isArchived;

    // Conditional Color Logic
    let balanceColor = "text-slate-300"; // Zero / Inactive
    let balanceBg = "bg-slate-50";

    if (balance > 0) {
        balanceColor = "text-emerald-600";
        balanceBg = "bg-emerald-50";
    } else if (balance < 0) {
        balanceColor = "text-rose-600";
        balanceBg = "bg-rose-50";
    }

    // Icon Contrast Logic: Darker version of the type color
    const baseColorClass = TYPE_COLORS[account.type] || "text-slate-500 border-slate-200 bg-slate-100";

    // We basically want to override the colorClass to be high contrast if needed, 
    // but for now let's stick to the existing mapping but ensure the icons pop.
    // The previous implementation used "bg-X-500/10 text-X-400". 
    // We will slightly darken it for the light theme.

    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1",
            "bg-white/80 border-slate-200 backdrop-blur-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] hover:border-slate-300",
            isArchived && "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
        )}>
            {/* Background Glow for Negatives */}
            {balance < 0 && (
                <div className="absolute inset-0 bg-rose-500/5 z-0 pointer-events-none" />
            )}

            <div className="relative z-10 p-5 flex flex-col h-full justify-between min-h-[160px]">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className={cn("p-2.5 rounded-xl border-none ring-1 ring-inset", colorClass.replace("500/10", "500/20").replace("text-zinc-400", "text-slate-600").replace("border-zinc-500/20", "ring-slate-200/50"))}>
                        <Icon className="w-5 h-5" />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-slate-100">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1 bg-white border-slate-200 shadow-xl" align="end">
                            <div className="flex flex-col space-y-0.5">
                                <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={() => onEdit(account)}>
                                    <Pencil className="w-3 h-3 mr-2" /> Editar
                                </Button>

                                {isArchived ? (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => onRestore?.(account.id)}>
                                        <ArrowUpRight className="w-3 h-3 mr-2" /> Restaurar
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={() => onArchive(account.id)}>
                                        <Archive className="w-3 h-3 mr-2" /> Archivar
                                    </Button>
                                )}

                                {balance === 0 && (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => onDelete(account.id)}>
                                        <Trash2 className="w-3 h-3 mr-2" /> Eliminar
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Amount */}
                <div className="mt-5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        {account.name}
                        {isArchived && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px]">ARCHIVED</span>}
                    </span>
                    <div className={cn(
                        "text-3xl font-bold tracking-tighter mt-1 truncate",
                        balanceColor
                    )}>
                        {formatCurrency(balance)}
                    </div>
                </div>


                {/* Footer / Link to History */}
                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <Link href={`/finance/account/${account.id}/history`} className="group-hover:text-blue-500 transition-colors flex items-center gap-1 w-full">
                        Ver historial
                        <History className="w-3 h-3 group-hover:translate-x-0.5 transition-transform ml-auto" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
