"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Banknote, Calendar, CheckSquare, Square, Download } from "lucide-react";
import { toggleVerification } from "@/app/finance/actions";
import ExportStatementButton from "./ExportStatementButton";

export default function StatementTable({ statement }: { statement: any }) {
    const { movements, summary, customer } = statement;
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    // Optimistic State for UI matching
    const [optimisticVerifications, setOptimisticVerifications] = useState<Record<string, boolean>>({});

    const handleToggle = async (id: string, type: 'DEBIT' | 'CREDIT', currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setOptimisticVerifications(prev => ({ ...prev, [id]: newStatus }));

        try {
            const result = await toggleVerification(id, type, newStatus);
            if (!result.success) {
                alert("Error al actualizar: " + result.error);
                setOptimisticVerifications(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        } catch (e) {
            alert("Error de conexión");
            setOptimisticVerifications(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const isVerified = (m: any) => {
        return optimisticVerifications[m.id] !== undefined
            ? optimisticVerifications[m.id]
            : m.isVerified;
    };

    const filteredMovements = showOnlyPending
        ? movements.filter((m: any) => !isVerified(m))
        : movements;

    // Split into invoices and payments
    const invoices = filteredMovements.filter((m: any) => m.type === 'DEBIT');
    const payments = filteredMovements.filter((m: any) => m.type === 'CREDIT');

    return (
        <div className="space-y-6 relative pb-28">
            {/* Quick Filters */}
            <div className="flex justify-between flex-wrap gap-4 items-center bg-background p-4 justify-end rounded-2xl border border-border shadow-sm transition-colors">
                <div className="flex bg-surface-hover p-1 rounded-lg transition-colors">
                    <button
                        onClick={() => setShowOnlyPending(false)}
                        className={`text-xs font-bold px-4 py-2 rounded-md transition-all ${!showOnlyPending ? "bg-background text-slate-800 dark:text-white shadow-sm" : "text-muted hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Ver Todo
                    </button>
                    <button
                        onClick={() => setShowOnlyPending(true)}
                        className={`text-xs font-bold px-4 py-2 rounded-md transition-all ${showOnlyPending ? "bg-background text-slate-800 dark:text-white shadow-sm" : "text-muted hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Solo Pendientes
                    </button>
                </div>
            </div>

            {/* Dual Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Panel: Invoices */}
                <div className="bg-white dark:bg-[#131517] rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-full transition-colors">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-10 transition-colors">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-tight transition-colors">
                            <ShoppingCart className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            Facturas (Deuda)
                        </h3>
                        <span className="text-xs font-bold text-muted bg-background px-2 py-1 rounded-full border border-border shadow-sm transition-colors">{invoices.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {invoices.length === 0 && (
                            <div className="text-center p-8 text-slate-400 text-sm italic">No hay facturas para mostrar.</div>
                        )}
                        {invoices.map((inv: any) => {
                            const checked = isVerified(inv);
                            return (
                                <div
                                    key={inv.id}
                                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 cursor-pointer group ${checked
                                        ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 shadow-inner"
                                        : "bg-background border-border shadow-sm hover:border-blue-200 dark:hover:border-blue-500/30"
                                        }`}
                                    onClick={() => handleToggle(inv.id, inv.type, checked)}
                                >
                                    <div className="shrink-0 text-blue-500 dark:text-blue-400 transition-transform group-hover:scale-110">
                                        {checked ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 opacity-30 dark:opacity-40 group-hover:opacity-60 dark:group-hover:opacity-80" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-bold truncate transition-colors ${checked ? "text-muted" : "text-foreground"}`}>
                                                {inv.concept}
                                            </span>
                                            <span className={`font-black text-sm tabular-nums whitespace-nowrap transition-colors ${checked ? "text-muted" : "text-foreground"}`}>
                                                {formatCurrency(inv.debit)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted transition-colors">
                                            <div className="flex items-center gap-1 opacity-80">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(inv.date)}
                                            </div>
                                            {inv.detailsId && (
                                                <a href={`/sales/${inv.detailsId}`} target="_blank" onClick={(e) => e.stopPropagation()} className="font-semibold text-blue-500 dark:text-blue-400 hover:underline transition-colors">Ver detalle</a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Payments */}
                <div className="bg-emerald-50/20 dark:bg-emerald-500/5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 overflow-hidden shadow-sm flex flex-col h-full transition-colors">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between sticky top-0 z-10 transition-colors">
                        <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-tight transition-colors">
                            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            Abonos (Pagado)
                        </h3>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-background px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-sm transition-colors">{payments.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {payments.length === 0 && (
                            <div className="text-center p-8 text-emerald-600/50 dark:text-emerald-500/50 text-sm italic transition-colors">No hay abonos para mostrar.</div>
                        )}
                        {payments.map((pay: any) => {
                            const checked = isVerified(pay);
                            return (
                                <div
                                    key={pay.id}
                                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 cursor-pointer group ${checked
                                        ? "bg-emerald-100/50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 shadow-inner"
                                        : "bg-background border-emerald-100 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 shadow-sm"
                                        }`}
                                    onClick={() => handleToggle(pay.id, pay.type, checked)}
                                >
                                    <div className="shrink-0 text-emerald-600 dark:text-emerald-500 transition-transform group-hover:scale-110">
                                        {checked ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 opacity-40 group-hover:opacity-70" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-bold truncate transition-colors ${checked ? "text-emerald-700/70 dark:text-emerald-500/70" : "text-emerald-900 dark:text-emerald-400"}`}>
                                                {pay.concept} {pay.method ? `(${pay.method})` : ""}
                                            </span>
                                            <span className={`font-black text-sm tabular-nums whitespace-nowrap transition-colors ${checked ? "text-emerald-600/70 dark:text-emerald-500/70" : "text-emerald-600 dark:text-emerald-500"}`}>
                                                {formatCurrency(pay.credit)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-emerald-600/70 dark:text-emerald-500/70 transition-colors">
                                            <div className="flex items-center gap-1 opacity-90">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(pay.date)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Floating Summary Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 z-50 w-[95%] md:w-auto min-w-[320px]">
                <div className="bg-slate-900 dark:bg-black text-white p-4 pr-3 rounded-2xl shadow-2xl border-4 border-slate-800 dark:border-[#1A1C1E] flex items-center justify-between gap-6 backdrop-blur-md bg-slate-900/95 dark:bg-black/95 transition-colors">

                    <div className="flex items-center gap-4 text-sm font-medium pl-2">
                        <div className="flex flex-col">
                            <span className="text-muted text-[10px] uppercase tracking-widest font-bold transition-colors">Total Facturado</span>
                            <span className="font-mono text-slate-200 dark:text-slate-300 transition-colors">{formatCurrency(summary.totalDebit)}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-700">-</div>
                        <div className="flex flex-col">
                            <span className="text-muted text-[10px] uppercase tracking-widest font-bold transition-colors">Total Pagado</span>
                            <span className="font-mono text-emerald-400 dark:text-emerald-500 transition-colors">{formatCurrency(summary.totalCredit)}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-700">=</div>
                        <div className="flex flex-col pr-4 border-r border-slate-800 dark:border-[#1A1C1E] transition-colors">
                            <span className="text-emerald-400 dark:text-emerald-500 text-[10px] uppercase tracking-widest font-bold transition-colors">Saldo a Conciliar</span>
                            <span className="font-black text-xl tracking-tighter tabular-nums">{formatCurrency(Math.max(0, summary.totalDebit - summary.totalCredit))}</span>
                        </div>
                    </div>

                    <div className="shrink-0">
                        {/* We use a slightly styled version of the export button to fit the dark bar */}
                        <ExportStatementButton data={statement} />
                    </div>
                </div>
            </div>

        </div>
    );
}
