"use client";

import { useEffect, useState, useMemo } from "react";
import { getAccountDetails } from "@/app/finance/actions";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, Search, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming exists or standard shadcn
import { Input } from "@/components/ui/input"; // Assuming exists
import * as XLSX from "xlsx"; // You might need to install this if not distinct
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AccountHistoryPage({ params }: { params: { id: string } }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("THIS_MONTH");

    useEffect(() => {
        const load = async () => {
            try {
                // Calculate dates based on range
                let start, end;
                const now = new Date();

                if (dateRange === "THIS_MONTH") {
                    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
                } else if (dateRange === "LAST_MONTH") {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                    end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
                }

                const result = await getAccountDetails(params.id, start, end);
                setData(result);
                document.title = `Historial - ${result.account.name} | LATIDOS`;
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [params.id, dateRange]);

    const filteredTransactions = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.filter((tx: any) =>
            tx.description.toLowerCase().includes(search.toLowerCase()) ||
            tx.category.toLowerCase().includes(search.toLowerCase()) ||
            // @ts-ignore
            tx.amount.toString().includes(search)
        );
    }, [data, search]);

    const exportToExcel = () => {
        if (!filteredTransactions.length) return;
        const ws = XLSX.utils.json_to_sheet(filteredTransactions.map((tx: any) => ({
            Fecha: new Date(tx.date).toLocaleDateString(),
            Tipo: tx.type === 'INCOME' ? 'INGRESO' : 'EGRESO',
            Categoria: tx.category,
            Descripcion: tx.description,
            Monto: tx.amount,
            Usuario: tx.user?.name || 'Sistema'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial");
        XLSX.writeFile(wb, `Historial_${data.account.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        if (!filteredTransactions.length) return;
        const doc = new jsPDF();
        doc.text(`Historial: ${data.account.name}`, 14, 15);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableData = filteredTransactions.map((tx: any) => [
            new Date(tx.date).toLocaleDateString(),
            tx.type === 'INCOME' ? '+' : '-',
            tx.description,
            formatCurrency(Number(tx.amount))
        ]);

        autoTable(doc, {
            head: [['Fecha', 'T.', 'Descripción', 'Monto']],
            body: tableData,
            startY: 30,
        });
        doc.save(`Historial_${data.account.name}.pdf`);
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando historial...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">Error al cargar la cuenta.</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/finance" className="inline-flex items-center text-muted hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-2 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Finanzas
                    </Link>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">
                        {data.account.name}
                    </h1>
                    <div className={`text-xl font-bold ${Number(data.account.balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(Number(data.account.balance))}
                        <span className="text-sm font-medium text-muted ml-2">Saldo Actual</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel} className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white transition-colors">
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-surface p-4 rounded-xl shadow-sm dark:shadow-none border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4 w-full">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0" />
                        <Input
                            placeholder="Buscar movimiento..."
                            className="pl-9 bg-slate-50 dark:bg-black/20 border-border text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-surface-hover p-1 rounded-lg">
                    <button
                        onClick={() => setDateRange("THIS_MONTH")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRange === 'THIS_MONTH' ? 'bg-surface shadow dark:shadow-sm text-foreground' : 'text-muted hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Este Mes
                    </button>
                    <button
                        onClick={() => setDateRange("LAST_MONTH")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRange === 'LAST_MONTH' ? 'bg-surface shadow dark:shadow-sm text-foreground' : 'text-muted hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Mes Pasado
                    </button>
                    <button
                        onClick={() => setDateRange("ALL")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRange === 'ALL' ? 'bg-surface shadow dark:shadow-sm text-foreground' : 'text-muted hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Todo
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-2xl border border-border shadow-sm dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-left">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs w-32">Fecha</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Concepto / Descripción</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredTransactions.map((tx: any) => (
                                <tr key={tx.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-muted font-medium text-xs whitespace-nowrap">
                                        {new Date(tx.date).toLocaleDateString()} <br />
                                        <span className="text-[10px] text-muted">
                                            {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${tx.type === 'INCOME' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                }`}>
                                                {tx.category}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted uppercase">
                                                {tx.user?.name || 'Sistema'}
                                            </span>
                                        </div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                            {tx.description}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`text-sm font-black tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                            {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center text-slate-400 dark:text-slate-600 italic">
                                        No se encontraron movimientos en este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
