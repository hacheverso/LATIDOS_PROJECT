
import { prisma } from "@/lib/prisma";
import CustomerProfileForm from "./CustomerProfileForm";
import CustomerSalesHistory from "./CustomerSalesHistory";
import { Users, AlertTriangle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
    const customer = await prisma.customer.findUnique({
        where: { id: params.id },
        include: {
            sales: {
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!customer) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Cliente no encontrado</h1>
                    <p className="text-slate-500 font-medium mb-6">El cliente que buscas no existe o ha sido eliminado.</p>
                    <a href="/directory/customers" className="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                        VOLVER AL DIRECTORIO
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <a href="/directory/customers" className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                    ← Volver al Directorio
                </a>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    GESTIÓN DE CLIENTE
                </h1>
                <p className="text-slate-500 font-medium ml-11">Visualiza y actualiza la información del comprador.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Form */}
                <div className="lg:col-span-5 h-full">
                    <CustomerProfileForm customer={customer} />
                </div>

                {/* Right Column: Sales History */}
                <div className="lg:col-span-7 h-full">
                    <CustomerSalesHistory sales={customer.sales} />
                </div>
            </div>
        </div>
    );
}
