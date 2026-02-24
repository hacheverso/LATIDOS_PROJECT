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
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight, History, MoreHorizontal, Filter, CheckCircle2 } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, or alert fallback
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FinanceDashboardProps {
    accounts: any[];
    recentTransactions: any[];
}

type ViewMode = 'ACTIVE' | 'ARCHIVED' | 'ALL';

export default function FinanceDashboard({ accounts, recentTransactions: initialTransactions, pagination: initialPagination }: any) {
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("INCOME");
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('ACTIVE');
    const [assetFilter, setAssetFilter] = useState<string | null>(null);

    const [editAccount, setEditAccount] = useState<any>(null); // If set, modal is open

    // New State for Pagination & Verification
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingOnly, setPendingOnly] = useState(false);

    // Client-side transactions (initially SSR) - Need to refetch if pagination/filter changes?
    // For simplicity, we might just reload the page or use client-side fetching.
    // Given the architecture, let's use router.push with searchParams ideally, 
    // BUT since this is a "Dashboard" component receiving props, we might need to wrap it or effectively use a client action to fetch more?
    // The user requested pagination. Let's assume we receive full props from server page, so we will use router refresh or state fetch?
    // Actually, `getFinanceMetrics` is an action. We can call it client side to update list!

    const [transactions, setTransactions] = useState(initialTransactions);
    const [pagination, setPagination] = useState(initialPagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(false);

    // Fetch on filter/page change
    async function fetchTransactions(page: number, showPendingOnly: boolean) {
        setLoading(true);
        try {
            const { recentTransactions, pagination: newPagination } = await import("./actions").then(m => m.getFinanceMetrics(page, 50, { pendingOnly: showPendingOnly }));
            setTransactions(recentTransactions);
            setPagination(newPagination);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando movimientos");
        } finally {
            setLoading(false);
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setCurrentPage(newPage);
        fetchTransactions(newPage, pendingOnly);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFilterToggle = () => {
        const newState = !pendingOnly;
        setPendingOnly(newState);
        setCurrentPage(1); // Reset to page 1
        fetchTransactions(1, newState);
    };

    const handleVerifyParams = async (id: string) => {
        try {
            // Optimistic update
            setTransactions((prev: any[]) => prev.map((t: any) => t.id === id ? { ...t, isVerified: !t.isVerified } : t));
            await import("./actions").then(m => m.toggleTransactionVerification(id));
            toast.success("Estado actualizado");
        } catch (error) {
            toast.error("No se pudo actualizar");
            // Revert
            fetchTransactions(currentPage, pendingOnly);
        }
    };


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
            filtered = filtered.filter((a: any) => !a.isArchived);
        } else if (viewMode === 'ARCHIVED') {
            filtered = filtered.filter((a: any) => a.isArchived);
        }

        // 2. Type sorting helper
        const getSortType = (acc: any) => {
            let type = acc.type;
            if (type !== 'RETOMA' && type !== 'NOTA_CREDITO') {
                if (/efectivo|caja|oficina/i.test(acc.name)) type = 'CASH';
                else if (/banco|bank/i.test(acc.name)) type = 'BANK';
            } else {
                if (/garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(acc.name)) type = 'NOTA_CREDITO';
                else if (/retoma/i.test(acc.name)) type = 'RETOMA';
            }
            return type;
        };

        const typeOrder: Record<string, number> = { CASH: 1, BANK: 2, WALLET: 3, RETOMA: 4, NOTA_CREDITO: 5 };

        // 3. Sorting
        return filtered.sort((a: any, b: any) => {
            const typeA = getSortType(a);
            const typeB = getSortType(b);

            const orderA = typeOrder[typeA] || 6;
            const orderB = typeOrder[typeB] || 6;

            if (orderA !== orderB) return orderA - orderB;

            // Then Balance Descending
            return Number(b.balance) - Number(a.balance);
        });
    }, [accounts, viewMode]);

    // Find the highest liquidity operative account
    const highestLiquidityId = useMemo(() => {
        let maxId = null;
        let maxBalance = -Infinity;
        for (const acc of displayedAccounts) {
            const type = acc.type;
            const isSystem = type === 'RETOMA' || type === 'NOTA_CREDITO' || /retoma|garant[íi]a|nota\s*cr[ée]dito|\bnc\b/i.test(acc.name);
            if (!isSystem && Number(acc.balance) > maxBalance) {
                maxBalance = Number(acc.balance);
                maxId = acc.id;
            }
        }
        return maxId;
    }, [displayedAccounts]);

    return (
        <div className="w-full pb-32 animate-in fade-in duration-500">

            {/* 1. Header & Quick Actions */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        Finanzas
                    </h1>
                    <p className="text-slate-400 font-medium text-[10px] md:text-xs tracking-wide">
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

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                    {displayedAccounts.map((acc: any) => (
                        <NanoCard
                            key={acc.id}
                            account={acc}
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                            onEdit={setEditAccount}
                            isHighestLiquidity={acc.id === highestLiquidityId}
                            onTransferClick={() => setTransferModalOpen(true)}
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
                    <div className="flex items-center gap-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <History className="w-4 h-4 text-slate-400" />
                            {pendingOnly ? 'Pendientes de Verificar' : 'Últimos Movimientos'}
                        </h3>
                        {loading && <div className="text-[10px] text-slate-400 animate-pulse">Cargando...</div>}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleFilterToggle}
                            className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-all border ${pendingOnly
                                ? 'bg-amber-100 text-amber-600 border-amber-200 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {pendingOnly ? 'Ver Todo' : 'Solo Pendientes'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider text-slate-400 font-bold text-left">
                            <tr>
                                <th className="px-6 py-3 w-32">Fecha</th>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                                <th className="px-6 py-3 w-16 text-center bg-emerald-50/50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4 mx-auto" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.map((tx: any) => (
                                <tr
                                    key={tx.id}
                                    className={`group transition-all duration-300 ${tx.isVerified
                                        ? 'bg-slate-50/30 hover:bg-slate-50 opacity-60 hover:opacity-100 grayscale-[0.5] hover:grayscale-0'
                                        : 'hover:bg-blue-50/30 bg-white'
                                        }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">
                                        {formatDate(tx.date)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">
                                            {tx.description}
                                        </div>
                                        {/* Client Name Display */}
                                        {tx.payment?.sale?.customer?.name && (
                                            <div className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                                <span className="text-slate-300">Cliente:</span>
                                                {tx.payment.sale.customer.name}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                {tx.category}
                                            </span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">
                                                {tx.account?.name || 'Cuenta'}
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
                                            <span className="hidden sm:inline">{tx.operatorName || tx.user?.name?.split(' ')[0] || 'Sistema'}</span>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 text-center ${tx.isVerified ? 'bg-emerald-50/30' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={tx.isVerified}
                                            onChange={() => handleVerifyParams(tx.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer accent-emerald-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-300 text-xs italic">
                                        {pendingOnly ? 'No hay movimientos pendientes de verificar 👏' : 'Sin movimientos recientes'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                            Anterior
                        </Button>
                        <span className="text-[10px] font-medium text-slate-400">
                            Página <span className="font-bold text-slate-600">{currentPage}</span> de {pagination.totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === pagination.totalPages || loading}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
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
