"use client";

import { useState, useMemo } from "react";
import { LiquidityTiers } from "./components/LiquidityTiers";
import { NanoCard } from "./components/NanoCard";
import { CommandDock } from "./components/CommandDock";
// @ts-ignore
import AddAccountModal from "./AddAccountModal";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { TransferModal } from "./components/TransferModal";
import { EditAccountModal } from "./components/EditAccountModal";
import { archiveAccount, deleteAccount, unarchiveAccount } from "./actions";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, History, MoreHorizontal, Filter } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, or alert fallback
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FinanceDashboardProps {
    accounts: any[];
    recentTransactions: any[];
}

type ViewMode = 'ACTIVE' | 'ARCHIVED' | 'ALL';

export default function FinanceDashboard({ accounts, recentTransactions }: FinanceDashboardProps) {
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("INCOME");
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('ACTIVE');
    const [assetFilter, setAssetFilter] = useState<string | null>(null);

    const [editAccount, setEditAccount] = useState<any>(null); // If set, modal is open

    const handleArchive = async (id: string) => {
        if (confirm("¿Seguro que deseas archivar esta cuenta?")) {
            try {
                await archiveAccount(id);
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await unarchiveAccount(id);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("ESTA ACCIÓN ES IRREVERSIBLE. ¿Eliminar cuenta definitivamente?")) {
            try {
                await deleteAccount(id);
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    // --- SORTING & FILTERING LOGIC ---
    const displayedAccounts = useMemo(() => {
        let filtered = accounts;

        // 1. View Mode Filter
        if (viewMode === 'ACTIVE') {
            filtered = filtered.filter(a => !a.isArchived);
        } else if (viewMode === 'ARCHIVED') {
            filtered = filtered.filter(a => a.isArchived);
        }

        // 2. Hide System Assets from Main Grid (always)
        // Show ONLY Liquid Assets (Cash, Bank, Wallet) AND exclude misnamed system assets
        filtered = filtered.filter(a => {
            const isLiquidType = ["CASH", "BANK", "WALLET"].includes(a.type);
            const isSystemName = /retoma|garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(a.name);
            return isLiquidType && !isSystemName;
        });

        // 3. Sorting
        return filtered.sort((a, b) => {
            // Force "Efectivo" / "Caja" / "Saldo Oficina" to top
            const isAPriority = /efectivo|caja|oficina/i.test(a.name);
            const isBPriority = /efectivo|caja|oficina/i.test(b.name);

            if (isAPriority && !isBPriority) return -1;
            if (!isAPriority && isBPriority) return 1;

            // Then Balance Descending
            return Number(b.balance) - Number(a.balance);
        });
    }, [accounts, viewMode]);

    const displayedTransactions = useMemo(() => {
        if (!assetFilter) return recentTransactions;

        // Filter by related account type if assetFilter is active
        return recentTransactions.filter(tx => {
            // We need to look up the account type for each transaction
            // Ideally the transaction object has the account included.
            // Based on types, tx.account should exist.
            return tx.account?.type === assetFilter;
        });
    }, [recentTransactions, assetFilter]);


    return (
        <div className="w-full pb-32 animate-in fade-in duration-500">

            {/* 1. Header & Quick Actions */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        Finanzas
                    </h1>
                    <p className="text-slate-400 font-medium text-xs tracking-wide">
                        Panel de Control
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Add Account Ghost Button */}
                    <div className="scale-75 origin-right">
                        <AddAccountModal />
                    </div>
                </div>
            </div>

            {/* 2. Liquidity Tiers */}
            <LiquidityTiers
                accounts={accounts} // Pass ALL accounts for accurate totals
                onFilterClick={setAssetFilter}
                activeFilter={assetFilter}
            />

            {/* 3. Account Grid */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${viewMode === 'ARCHIVED' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {viewMode === 'ARCHIVED' ? 'Cuentas Archivadas' : 'Cuentas Activas'}
                    </h3>

                    {/* View Filter Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-slate-600">
                                <Filter className="w-3 h-3 mr-2" />
                                Ver: {viewMode === 'ALL' ? 'Todas' : viewMode === 'ARCHIVED' ? 'Archivadas' : 'Activas'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewMode('ACTIVE')}>Ver Activas</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode('ARCHIVED')}>Ver Archivadas</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode('ALL')}>Ver Todas</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {displayedAccounts.map((acc) => (
                        <NanoCard
                            key={acc.id}
                            account={acc}
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                            onEdit={setEditAccount}
                        />
                    ))}
                    {displayedAccounts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-300 text-sm italic border-2 border-dashed border-slate-100 rounded-3xl">
                            No hay cuentas para mostrar en esta vista.
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Recent Activity Feed */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        {assetFilter ? `Movimientos: ${assetFilter}` : 'Últimos Movimientos'}
                    </h3>
                    <div className="flex items-center gap-2">
                        {assetFilter && (
                            <button
                                onClick={() => setAssetFilter(null)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wide bg-rose-50 px-2 py-1 rounded-full transition-colors"
                            >
                                Limpiar Filtro
                            </button>
                        )}
                        <button className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-wide flex items-center gap-1 transition-colors">
                            Ver Todo <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-50">
                            {displayedTransactions.map((tx) => (
                                <tr key={tx.id} className="group hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400 w-24">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">
                                            {tx.description}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                {tx.category}
                                            </span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">
                                                {tx.account.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-black text-sm tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-300 uppercase flex justify-end items-center gap-1">
                                            {tx.operatorName && <span className="text-indigo-400 font-bold">★</span>}
                                            {tx.operatorName || tx.user?.name?.split(' ')[0] || 'Sistema'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {displayedTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center text-slate-300 text-xs italic">
                                        Sin movimientos recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Command Dock */}
            <CommandDock
                onIncome={() => { setTransactionType("INCOME"); setTransactionModalOpen(true); }}
                onExpense={() => { setTransactionType("EXPENSE"); setTransactionModalOpen(true); }}
                onTransfer={() => setTransferModalOpen(true)}
            />

            {/* Modals */}
            <AddTransactionModal
                isOpen={transactionModalOpen}
                onClose={() => setTransactionModalOpen(false)}
                type={transactionType}
            />

            <TransferModal
                isOpen={transferModalOpen}
                onClose={() => setTransferModalOpen(false)}
            />

            <EditAccountModal
                account={editAccount}
                isOpen={!!editAccount}
                onClose={() => setEditAccount(null)}
            />

        </div>
    );
}
