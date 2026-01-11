"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportButtonProps {
    transactions: any[];
    accountName: string;
}

export default function ExportButton({ transactions, accountName }: ExportButtonProps) {
    const handleExport = () => {
        if (!transactions || transactions.length === 0) {
            alert("No hay datos para exportar");
            return;
        }

        // Format data for Excel
        const data = transactions.map(tx => ({
            Fecha: new Date(tx.date).toLocaleDateString(),
            Hora: new Date(tx.date).toLocaleTimeString(),
            Descripción: tx.description,
            Categoría: tx.category,
            Tipo: tx.type === 'INCOME' ? 'Entrada' : 'Salida',
            Monto: Number(tx.amount),
            Cuenta: tx.account?.name || accountName,
            Usuario: tx.user?.name || "Sistema"
        }));

        // Create Worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Adjust column widths
        const wscols = [
            { wch: 12 }, // Date
            { wch: 10 }, // Time
            { wch: 30 }, // Description
            { wch: 20 }, // Category
            { wch: 10 }, // Type
            { wch: 15 }, // Amount
            { wch: 20 }, // Account
            { wch: 20 }  // User
        ];
        ws['!cols'] = wscols;

        // Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

        // Generate filename
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `Movimientos_${accountName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

        // Write file
        XLSX.writeFile(wb, fileName);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold uppercase text-xs rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
            <Download className="w-4 h-4" />
            Exportar Excel
        </button>
    );
}
