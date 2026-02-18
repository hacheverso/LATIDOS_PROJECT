import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import InventoryTable from "../InventoryTable";
import InventoryHeaderActions from "../InventoryHeaderActions";
import { getCategories } from "../actions";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) return <div>No autorizado</div>;

    // Fetch products
    const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        include: {
            instances: {
                where: { status: "IN_STOCK" },
                select: { cost: true }
            },
            categoryRel: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    const categories = await getCategories();

    // 2. Fetch "Last Known Cost" for Out-of-Stock items
    // Using distinct to get the MOST RECENT instance for each product
    const outOfStockIds = products.filter(p => p.instances.length === 0).map(p => p.id);
    let lastCosts: Record<string, number> = {};

    if (outOfStockIds.length > 0) {
        const lastInstances = await prisma.instance.findMany({
            where: {
                productId: { in: outOfStockIds },
                // We want history, so status doesn't matter (can be SOLD, etc.)
            },
            orderBy: [
                { productId: 'asc' },
                { createdAt: 'desc' }
            ],
            distinct: ['productId'],
            select: {
                productId: true,
                cost: true
            }
        });

        lastCosts = lastInstances.reduce((acc, curr) => ({ ...acc, [curr.productId]: Number(curr.cost || 0) }), {});
    }

    // Transform
    const formattedProducts = products.map(p => {
        const stockInstances = p.instances;

        let totalCost = 0;
        let count = stockInstances.length;
        let averageCost = 0;
        let isLastKnownCost = false;

        // Calculate Average Cost of CURRENT stock
        if (count > 0) {
            totalCost = stockInstances.reduce((sum, i) => sum + Number(i.cost), 0);
            averageCost = totalCost / count;
        } else {
            // Fallback to Last Known Cost
            if (lastCosts[p.id]) {
                averageCost = lastCosts[p.id];
                isLastKnownCost = true;
            }
        }

        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            category: p.category || (p.categoryRel?.name ?? "Sin Categoría"),
            upc: p.upc,
            stock: count,
            status: count > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
            basePrice: Number(p.basePrice),
            averageCost: averageCost,
            isLastKnownCost: isLastKnownCost, // New Flag
            imageUrl: p.imageUrl
        };
    });

    return (
        <div className="w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                        Catálogo
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión Operativa de Productos</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/inventory/new"
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo
                    </Link>
                    <Link
                        href="/inventory/inbound"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
                    >
                        <PackageCheck className="w-4 h-4" />
                        Recibir
                    </Link>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <InventoryHeaderActions />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <InventoryTable initialProducts={formattedProducts} allCategories={categories} />
            </div>
        </div>
    );
}
