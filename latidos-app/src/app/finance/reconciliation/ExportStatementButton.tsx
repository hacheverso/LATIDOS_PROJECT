"use client";

import { Download, Printer } from "lucide-react";

export default function ExportStatementButton() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
        >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
        </button>
    );
}
