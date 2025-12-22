import { prisma } from "@/lib/prisma";
import { Users, MapPin, Phone, Mail, Building } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const customers = await prisma.customer.findMany({
        include: {
            sales: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        Directorio de Clientes
                    </h1>
                    <p className="text-slate-500 font-medium">Gestiona tu base de datos de compradores</p>
                </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer) => (
                    <div key={customer.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                                {customer.sales.length} Compras
                            </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-lg uppercase truncate mb-1">
                            {customer.name}
                        </h3>
                        <p className="text-slate-400 text-xs font-mono mb-4 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {customer.taxId}
                        </p>

                        <div className="space-y-2 border-t border-slate-50 pt-4">
                            {customer.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-300" />
                                    <span>{customer.phone}</span>
                                </div>
                            )}
                            {customer.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail className="w-4 h-4 text-slate-300" />
                                    <span className="truncate">{customer.email}</span>
                                </div>
                            )}
                            {customer.address && (
                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 text-slate-300 mt-1" />
                                    <span className="line-clamp-2">{customer.address}</span>
                                </div>
                            )}
                            {/* Empty Fallback */}
                            {!customer.phone && !customer.email && !customer.address && (
                                <p className="text-slate-300 italic text-xs">Sin información de contacto adicional.</p>
                            )}
                        </div>
                    </div>
                ))}

                {customers.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <Users className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-slate-500 font-bold">No hay clientes registrados</h3>
                        <p className="text-slate-400 text-sm">Registra tu primer cliente desde el Punto de Venta.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
