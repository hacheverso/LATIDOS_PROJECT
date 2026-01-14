"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";

interface ExportProps {
    data?: any; // The full statement object
}

export default function ExportStatementButton({ data }: ExportProps) {

    const handleExport = () => {
        if (!data) return;

        const doc = new jsPDF();

        // 1. Header & Branding
        doc.setFontSize(18);
        doc.text("LATIDOS - Estado de Cuenta", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Cliente: ${data.customer.name}`, 14, 30);
        doc.text(`NIT: ${data.customer.taxId}`, 14, 35);
        doc.text(`Fecha Impresión: ${new Date().toLocaleDateString()}`, 14, 40);

        // 2. Summary
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 45, 180, 25, 'F');

        doc.text("Resumen:", 18, 55);
        doc.text(`Facturado: ${formatCurrency(data.summary.totalDebit)}`, 18, 62);
        doc.text(`Pagado: ${formatCurrency(data.summary.totalCredit)}`, 80, 62);
        doc.text(`Saldo Final: ${formatCurrency(data.summary.finalBalance)}`, 140, 62);

        // 3. Table
        const tableBody = data.movements.map((m: any) => [
            new Date(m.date).toLocaleDateString(),
            m.concept,
            m.isVerified ? "(Conciliado)" : "",
            m.debit > 0 ? formatCurrency(m.debit) : "-",
            m.credit > 0 ? formatCurrency(m.credit) : "-",
            formatCurrency(m.balance)
        ]);

        autoTable(doc, {
            startY: 80,
            head: [['Fecha', 'Concepto', 'Estado', 'Cargo', 'Abono', 'Saldo']],
            body: tableBody,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [15, 23, 42] }, // Slate 900
            // Highlight reconciled rows
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.raw[2] === "(Conciliado)") {
                    data.cell.styles.fillColor = [240, 253, 244]; // emerald-50
                    data.cell.styles.textColor = [100, 116, 139]; // slate-500
                }
            }
        });

        doc.save(`EstadoCuenta_${data.customer.name.replace(/\s+/g, '')}.pdf`);
    };

    if (!data) return null;

    return (
        <Button onClick={handleExport} className="bg-slate-900 text-white hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
        </Button>
    );
}
