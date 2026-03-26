import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function AuditHistoryPage() {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) return <div>No autorizado</div>;

    const audits = await prisma.stockAudit.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-white/5/50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-card border-b border-border">
                <div className="flex items-center gap-3">
                    <Link href="/inventory/audit" className="p-2 hover:bg-hover rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-secondary" />
                    </Link>
                    <div>
                        <h1 className="text-subheading text-primary tracking-tight">Historial de Auditorías</h1>
                        <p className="text-sm text-secondary font-medium">Registros anteriores</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-6 max-w-4xl mx-auto w-full">
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-header border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-secondary">Fecha</th>
                                    <th className="px-4 py-3 text-left font-bold text-secondary">Responsable</th>
                                    <th className="px-4 py-3 text-center font-bold text-secondary">Productos</th>
                                    <th className="px-4 py-3 text-center font-bold text-secondary">Diferencias</th>
                                    <th className="px-4 py-3 text-right font-bold text-secondary">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {audits.map(audit => (
                                    <tr key={audit.id} className="hover:bg-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-secondary" />
                                                <span className="font-medium text-primary">
                                                    {format(new Date(audit.createdAt), "PPP p", { locale: es })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-secondary" />
                                                <span className="text-secondary">{audit.user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-header text-primary font-bold text-xs">
                                                {audit.productsCounted}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {audit.discrepanciesFound > 0 ? (
                                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-red-100 text-red-700 dark:text-red-400 font-bold text-xs">
                                                    {audit.discrepanciesFound} Descuadres
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-green-100 text-green-700 dark:text-green-400 font-bold text-xs">
                                                    Perfecto
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/inventory/audit/history/${audit.id}`}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold text-xs"
                                            >
                                                Ver Detalle
                                                <FileText className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {audits.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-secondary">
                                            No hay auditorías registradas aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
