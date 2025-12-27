"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    date: Date;
    total: number;
    amountPaid: number;
    pendingBalance: number;
}

interface InvoiceListProps {
    invoices: Invoice[];
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleAll: (selected: boolean) => void;
}

export function InvoiceList({ invoices, selectedIds, onToggleSelect, onToggleAll }: InvoiceListProps) {
    const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;

    return (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Facturas Pendientes ({invoices.length})</h3>
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={allSelected}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggleAll(e.target.checked)}
                    />
                    <label className="text-sm font-medium text-slate-600">Seleccionar Todo</label>
                </div>
            </div>

            <div className="divide-y max-h-[400px] overflow-y-auto">
                {invoices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        No hay facturas pendientes para este cliente.
                    </div>
                ) : (
                    invoices.map((inv) => (
                        <div key={inv.id} className={cn(
                            "p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-l-4",
                            new Date(inv.date).getTime() < new Date().setMonth(new Date().getMonth() - 1)
                                ? "border-red-500 bg-red-50/10"
                                : "border-transparent"
                        )}>
                            <Checkbox
                                checked={selectedIds.includes(inv.id)}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggleSelect(inv.id)}
                            />
                            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                <div>
                                    <p className="font-bold text-slate-700">
                                        {inv.invoiceNumber || "N/A"}
                                        {new Date(inv.date).getTime() < new Date().setMonth(new Date().getMonth() - 1) && (
                                            <span className="ml-2 text-[10px] font-black text-red-500 bg-red-100 px-1.5 py-0.5 rounded uppercase">Vencida</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-400 capitalize">
                                        {new Date(inv.date).toLocaleDateString("es-CO", { dateStyle: "long" })}
                                    </p>
                                </div>
                                <div className="text-sm text-slate-500">
                                    Total: {formatCurrency(inv.total)}
                                </div>
                                <div className="text-sm text-slate-500">
                                    Pagado: {formatCurrency(inv.amountPaid)}
                                </div>
                                <div className="flex justify-end">
                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                        Debe: {formatCurrency(inv.pendingBalance)}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
