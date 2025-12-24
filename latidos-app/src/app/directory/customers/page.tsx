
import { prisma } from "@/lib/prisma";
import { Users, MapPin, Phone, Mail, Building, UserPlus, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function CustomersDirectoryPage() {
    const customers = await prisma.customer.findMany({
        include: {
            sales: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 min-h-screen bg-slate-50/50 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-slate-400" />
                        Directorio de Clientes
                    </h1>
                    <p className="text-slate-500 font-medium ml-11">Gestiona tu base de datos centralizada de compradores.</p>
                </div>

                <div className="flex gap-3">
                    {/* Placeholder for future specific "Add Customer" independent of POS if needed */}
                    {/* For now we just show the count or a decorative element, as adding is mainly done via POS or we could add a modal here later */}
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-600 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        {customers.length} Registrados
                    </div>
                </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {customers.map((customer) => (
                    <div key={customer.id} className="relative group">
                        <Link href={`/directory/customers/${customer.id}`} className="block h-full">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-white rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500" />

                                <div className="relative z-10 flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xl text-slate-700 border-2 border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="bg-slate-100/80 backdrop-blur text-slate-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-slate-200/50">
                                        {customer.sales.length} Compras
                                    </span>
                                </div>

                                <h3 className="relative z-10 font-black text-slate-800 text-lg uppercase truncate mb-1 group-hover:text-blue-700 transition-colors">
                                    {customer.name}
                                </h3>
                                <p className="relative z-10 text-slate-400 text-xs font-mono font-bold mb-5 flex items-center gap-1.5 opacity-80">
                                    <Building className="w-3 h-3" />
                                    {customer.taxId}
                                </p>

                                <div className="relative z-10 space-y-3 pt-4 border-t border-slate-50">
                                    {customer.phone ? (
                                        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                                                <Phone className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="truncate">{customer.phone}</span>
                                        </div>
                                    ) : null}

                                    {customer.email ? (
                                        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                                <Mail className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    ) : null}

                                    {customer.address ? (
                                        <div className="flex items-start gap-3 text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors mt-0.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="line-clamp-2 leading-relaxed text-xs">{customer.address}</span>
                                        </div>
                                    ) : null}

                                    {/* Empty Fallback */}
                                    {!customer.phone && !customer.email && !customer.address && (
                                        <p className="text-slate-300 italic text-xs py-2 text-center bg-slate-50/50 rounded-lg">Sin datos de contacto.</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}

                {customers.length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-slate-900 font-black text-xl mb-2">Directorio Vacío</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                            Aún no hay clientes en la base de datos.
                            <br />
                            <span className="text-blue-600 font-bold">Los clientes se registrarán automáticamente al realizar ventas.</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
