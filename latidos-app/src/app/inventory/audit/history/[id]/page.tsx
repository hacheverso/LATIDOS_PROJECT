import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const dynamic = 'force-dynamic';

interface DetailPageProps {
    params: { id: string };
}

interface AuditItem {
    productId: string;
    systemStock: number;
    physicalCount: number;
    difference: number;
    observations: string;
    contributions?: { userId: string; userName: string; count: number | string; observations?: string }[];
}

export default async function AuditDetailPage({ params }: DetailPageProps) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;
    if (!orgId) return <div>No autorizado</div>;

    const audit = await prisma.stockAudit.findFirst({
        where: { id: params.id, organizationId: orgId },
        include: { user: { select: { name: true } } }
    });

    if (!audit) return <div className="p-6 text-center text-secondary">Auditoría no encontrada</div>;

    // Fetch product names for the details
    const details = audit.details as unknown as AuditItem[];
    const productIds = details.map(d => d.productId);

    // We fetch current product info, but ideally we should have stored the name in the snapshot.
    // For now we fetch current names. If product is deleted, we might miss it (showing ID).
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true }
    });

    const productMap = new Map<string, { name: string, sku: string }>();
    products.forEach(p => productMap.set(p.id, { name: p.name, sku: p.sku }));

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-card border-b border-border">
                <div className="flex items-center gap-3">
                    <Link href="/inventory/audit/history" className="p-2 hover:bg-hover rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-secondary" />
                    </Link>
                    <div>
                        <h1 className="text-subheading text-primary tracking-tight">
                            Reporte de Auditoría
                        </h1>
                        <p className="text-sm text-secondary font-medium">
                            {format(new Date(audit.createdAt), "PPPP p", { locale: es })} — por {audit.user.name}
                        </p>
                    </div>
                </div>
                {/* Print Button (Placeholder for functionality) */}
                <button
                    className="p-2 hover:bg-hover rounded-lg text-secondary"
                    title="Imprimir (Próximamente)"
                >
                    <Printer className="w-5 h-5" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <p className="text-xs text-secondary uppercase font-bold">Total Contados</p>
                    <p className="text-subheading text-primary">{audit.productsCounted}</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <p className="text-xs text-secondary uppercase font-bold">Descuadres</p>
                    <p className={`text-subheading ${audit.discrepanciesFound > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {audit.discrepanciesFound}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="px-6 pb-6 max-w-5xl mx-auto w-full">
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-header border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-secondary">Producto</th>
                                    <th className="px-4 py-3 text-center font-bold text-secondary">Sistema</th>
                                    <th className="px-4 py-3 text-center font-bold text-secondary">Físico</th>
                                    <th className="px-4 py-3 text-center font-bold text-secondary">Dif.</th>
                                    <th className="px-4 py-3 text-left font-bold text-secondary">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {details.map((item, idx) => {
                                    const prod = productMap.get(item.productId);
                                    const diff = item.difference;
                                    const isMismatch = diff !== 0;

                                    return (
                                        <tr key={idx} className={isMismatch ? "bg-red-50/50" : ""}>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-bold text-primary">{prod?.name || "Producto Eliminado"}</p>
                                                    <p className="text-xs text-secondary font-mono">{prod?.sku || item.productId}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-secondary">
                                                {item.systemStock}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                                                {item.contributions && item.contributions.length > 0 ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help underline decoration-dotted decoration-slate-400">
                                                                    {item.physicalCount}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="p-2 space-y-1 bg-card border-border text-white">
                                                                <p className="text-xs text-secondary font-bold uppercase mb-2">Desglose de Conteo</p>
                                                                {item.contributions.map((c, i) => (
                                                                    <div key={i} className="flex justify-between gap-4 text-sm border-b border-border/10 pb-1 last:border-0 last:pb-0">
                                                                        <span className="font-medium truncate max-w-[120px]">{c.userName?.split(' ')[0] || "Usuario"}</span>
                                                                        <span className="font-mono font-bold">{c.count}</span>
                                                                    </div>
                                                                ))}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    item.physicalCount
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${diff === 0 ? "bg-green-100 text-green-700" :
                                                    diff > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {diff > 0 ? "+" : ""}{diff}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-secondary italic text-xs">
                                                {item.observations || "-"}
                                                {item.contributions && item.contributions.some(c => c.observations) && (
                                                    <div className="mt-1 space-y-1">
                                                        {item.contributions.filter(c => c.observations).map((c, i) => (
                                                            <p key={i} className="text-[10px] bg-header/50 p-1 rounded border border-border">
                                                                <span className="font-bold">{c.userName?.split(' ')[0]}:</span> {c.observations}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
