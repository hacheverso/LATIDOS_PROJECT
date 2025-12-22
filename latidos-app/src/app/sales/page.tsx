import { getSales } from "./actions";
import SalesTable from "./SalesTable";

export const dynamic = 'force-dynamic';

export default async function SalesHistoryPage() {
    const sales = await getSales();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                        Control Financiero <span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Tablero de ventas, recaudos y cuentas por cobrar.
                    </p>
                </div>
            </div>

            {/* Dashboard (Table + Metrics) */}
            <SalesTable initialSales={sales as any} />
        </div>
    );
}
