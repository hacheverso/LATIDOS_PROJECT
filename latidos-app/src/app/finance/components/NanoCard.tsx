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
    onTransferClick?: () => void;
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
    CASH: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    BANK: "bg-blue-50 text-blue-600 ring-blue-100",
    WALLET: "bg-purple-50 text-purple-600 ring-purple-100",
    RETOMA: "bg-amber-50 text-amber-600 ring-amber-100",
    NOTA_CREDITO: "bg-rose-50 text-rose-600 ring-rose-100",
};

// Text color for the big numbers
const TYPE_TEXT_COLORS: Record<string, string> = {
    CASH: "text-emerald-600",
    BANK: "text-blue-600",
    WALLET: "text-purple-600",
    RETOMA: "text-amber-600",
    NOTA_CREDITO: "text-rose-600",
};

import { ShieldX, AlertTriangle, ArrowRightLeft } from "lucide-react"; // Additional lucide imports

export function NanoCard({ account, onArchive, onEdit, onDelete, onRestore, isHighestLiquidity, onTransferClick }: NanoCardProps) {
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
    const boxColorClass = TYPE_BOX_COLORS[type] || "bg-slate-50 text-slate-600 ring-slate-200";
    const textColorClass = TYPE_TEXT_COLORS[type] || "text-slate-600";

    const balance = Number(account.balance);
    // @ts-ignore
    const isArchived = account.isArchived;

    // Retiro Necesario Alert (Only for CASH > 10,000,000)
    const needsWithdrawal = type === 'CASH' && balance > 10000000;

    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 block h-full",
            "bg-white/80 border-slate-200 backdrop-blur-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] hover:border-slate-300",
            isArchived && "opacity-60 grayscale hover:grayscale-0 hover:opacity-100",
            needsWithdrawal && "ring-2 ring-rose-400 ring-offset-2 border-transparent animate-in zoom-in-95 duration-500" // Subtle bounce in + red ring
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
                    <div className={cn("p-2.5 rounded-xl border-none ring-1 ring-inset", boxColorClass)}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {needsWithdrawal && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/80 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse border border-rose-200 shadow-sm mr-auto ml-3 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            Retiro Req.
                        </div>
                    )}

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-slate-100 ml-auto">
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {account.name}
                        {isArchived && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px]">ARCHIVED</span>}
                    </span>
                    <div
                        className={cn(
                            "text-3xl font-black tracking-tighter mt-1 truncate cursor-help flex items-baseline",
                            textColorClass
                        )}
                        title={formatCurrency(balance)}
                    >
                        {balance < 0 ? `- ${formatCurrency(Math.abs(balance))}` : formatCurrency(balance)}
                    </div>
                </div>
            </div>

            {/* Footer / Quick Actions */}
            <div className="pt-3 mt-4 border-t border-slate-100/60 bg-slate-50/50 flex flex-wrap items-center gap-2 justify-between px-5 pb-3">
                <Link href={`/finance/account/${account.id}/history`} className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hover:text-blue-500 transition-colors flex items-center gap-1">
                    Ver historial
                    <History className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                </Link>

                {isHighestLiquidity && onTransferClick && (
                    <Button
                        onClick={onTransferClick}
                        variant="default"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                    >
                        <ArrowRightLeft className="w-3 h-3 mr-1.5" /> Transferir
                    </Button>
                )}
            </div>
        </div>
    );
}
