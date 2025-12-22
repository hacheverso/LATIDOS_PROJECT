
import { DollarSign, Hammer } from "lucide-react";

export default function FinancePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                <div className="relative p-8 bg-white border border-slate-100 shadow-xl rounded-3xl">
                    <DollarSign className="w-16 h-16 text-slate-300" />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg">
                        <Hammer className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                    Finanzas
                </h1>
                <p className="text-slate-500 font-medium text-lg max-w-md mx-auto leading-relaxed">
                    Control de caja, reportes financieros y gestión de gastos en desarrollo.
                </p>
            </div>

            <div className="px-5 py-2 rounded-full bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wide">
                Próximamente
            </div>
        </div>
    );
}
