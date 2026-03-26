"use client";

import { useState } from "react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
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
    isHighestLiquidity?: boolean;
}

const TYPE_ICONS: Record<string, any> = {
    CASH: Banknote,
    BANK: Landmark,
    WALLET: Wallet,
    RETOMA: Archive,
    NOTA_CREDITO: ShieldX,
    DEFAULT: Wallet
};

// Colors for the small icon box
const TYPE_BOX_COLORS: Record<string, string> = {
    CASH: "bg-emerald-50 dark:bg-emerald-500/10 text-success dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-500/20",
    BANK: "bg-blue-50 dark:bg-blue-500/10 text-transfer ring-blue-100 dark:ring-blue-500/20",
    WALLET: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-100 dark:ring-purple-500/20",
    RETOMA: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-500/20",
    NOTA_CREDITO: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-100 dark:ring-rose-500/20",
};

// Text color for the big numbers
const TYPE_TEXT_COLORS: Record<string, string> = {
    CASH: "text-emerald-600 dark:text-success",
    BANK: "text-blue-600 dark:text-transfer",
    WALLET: "text-purple-600 dark:text-purple-500",
    RETOMA: "text-amber-600 dark:text-amber-500",
    NOTA_CREDITO: "text-rose-600 dark:text-rose-500",
};

import { ShieldX, AlertTriangle, ArrowRightLeft } from "lucide-react"; // Additional lucide imports

export function NanoCard({ account, onArchive, onEdit, onDelete, onRestore, isHighestLiquidity }: NanoCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Normalize type based on name overrides if needed
    let type = account.type;
    if (type !== 'RETOMA' && type !== 'NOTA_CREDITO') {
        if (/efectivo|caja|oficina/i.test(account.name)) type = 'CASH';
        else if (/banco|bank/i.test(account.name)) type = 'BANK';
    } else {
        if (/garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(account.name)) type = 'NOTA_CREDITO';
        else if (/retoma/i.test(account.name)) type = 'RETOMA';
    }

    const Icon = TYPE_ICONS[type] || TYPE_ICONS.DEFAULT;
    const boxColorClass = TYPE_BOX_COLORS[type] || "bg-header text-secondary ring-slate-200";
    const textColorClass = TYPE_TEXT_COLORS[type] || "text-secondary";

    const balance = Number(account.balance);
    // @ts-ignore
    const isArchived = account.isArchived;

    // Retiro Necesario Alert (CASH > 40,000,000 OR BANK > 10,000,000)
    const needsWithdrawal =
        (type === 'CASH' && balance >= 40000000) ||
        (type === 'BANK' && balance >= 10000000);

    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 block h-full flex flex-col justify-between",
            "bg-card dark:bg-background border-border backdrop-blur-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] hover:border-border dark:hover:border-border/20",
            isArchived && "opacity-60 grayscale hover:grayscale-0 hover:opacity-100",
            needsWithdrawal && "border-2 border-rose-400 dark:border-rose-500/70 shadow-[0_0_15px_rgba(225,29,72,0.15)] animate-in zoom-in-95 duration-500" // Replaced ring with border to prevent clipping
        )}>
            {/* Background Glow for Retiro Necesario */}
            {needsWithdrawal && (
                <div className="absolute inset-0 bg-rose-500/5 z-0 pointer-events-none animate-pulse" />
            )}
            {/* Background Glow for Negatives / Garantias */}
            {type === 'NOTA_CREDITO' && (
                <div className="absolute inset-0 bg-rose-500/5 z-0 pointer-events-none" />
            )}

            <div className="relative z-10 p-5 flex flex-col h-full justify-between min-h-[160px]">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className={cn("p-2.5 rounded-xl border-none ring-1 ring-inset transition-colors", boxColorClass)}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {needsWithdrawal && (
                        <div className="flex items-center justify-center gap-1.5 px-2.5 py-0.5 bg-rose-100/80 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full text-[9px] font-bold uppercase tracking-widest animate-pulse shadow-sm border border-rose-200 dark:border-rose-500/30 whitespace-nowrap ml-auto mr-2">
                            <AlertTriangle className="w-3 h-3" />
                            Retiro Req.
                        </div>
                    )}

                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <button className="text-muted hover:text-primary dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 ml-auto">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1 bg-background border-border shadow-xl" align="end">
                            <div className="flex flex-col space-y-0.5">
                                <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-secondary hover:bg-slate-100 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white" onClick={() => { onEdit(account); setIsOpen(false); }}>
                                    <Pencil className="w-3 h-3 mr-2" /> Editar
                                </Button>

                                {isArchived ? (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300" onClick={() => { onRestore?.(account.id); setIsOpen(false); }}>
                                        <ArrowUpRight className="w-3 h-3 mr-2" /> Restaurar
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-secondary hover:bg-slate-100 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white" onClick={() => { onArchive(account.id); setIsOpen(false); }}>
                                        <Archive className="w-3 h-3 mr-2" /> Archivar
                                    </Button>
                                )}

                                {balance === 0 && (
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => { onDelete(account.id); setIsOpen(false); }}>
                                        <Trash2 className="w-3 h-3 mr-2" /> Eliminar
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Amount */}
                <div className="mt-5">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2 transition-colors">
                        {account.name}
                        {isArchived && <span className="px-1.5 py-0.5 bg-header text-muted rounded text-[9px]">ARCHIVED</span>}
                    </span>
                    <div
                        className={cn(
                            "text-heading tracking-tighter mt-1 truncate cursor-help flex items-baseline transition-colors",
                            textColorClass
                        )}
                        title={formatCurrency(balance)}
                    >
                        {balance < 0 ? `- ${formatCurrency(Math.abs(balance))}` : formatCurrency(balance)}
                    </div>
                </div>
            </div>

            {/* Footer / Quick Actions */}
            <div className="pt-3 border-t border-border/60 bg-header/50 dark:bg-header flex flex-wrap items-center gap-2 justify-between px-5 pb-3 transition-colors">
                <Link href={`/finance/account/${account.id}/history`} className="text-[10px] text-muted font-bold uppercase tracking-wider hover:text-transfer dark:hover:text-blue-400 transition-colors flex items-center gap-1 w-full h-full">
                    Ver historial
                    <History className="w-3 h-3 group-hover:rotate-45 transition-transform ml-1" />
                </Link>
            </div>
        </div>
    );
}
