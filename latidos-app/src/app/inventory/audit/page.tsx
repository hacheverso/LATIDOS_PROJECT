import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuditTable from "./components/AuditTable";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                Acceso denegado.
            </div>
        );
    }

    // Fetch Products with Stock Count
    // We need to count instances with status 'IN_STOCK'
    const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        select: {
            id: true,
            name: true,
            sku: true,
            upc: true,
            imageUrl: true,
            category: true,
            _count: {
                select: {
                    instances: {
                        where: { status: 'IN_STOCK' }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    // Transform to flat structure for client component
    const formattedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        upc: p.upc,
        imageUrl: p.imageUrl,
        category: p.category || "GENERAL",
        systemStock: p._count.instances
    }));

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#131517]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white dark:bg-card border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                        <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Auditoría de Stock</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Conteo Físico vs Sistema</p>
                    </div>
                </div>
                <Link href="/inventory/audit/history" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors">
                    Ver Historial
                </Link>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
                <div className="h-full flex flex-col">
                    <AuditTable initialProducts={formattedProducts} />
                </div>
            </div>
        </div>
    );
}
