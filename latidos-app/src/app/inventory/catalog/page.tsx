import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import InventoryTable from "../InventoryTable";
import InventoryHeaderActions from "../InventoryHeaderActions";
import { getCategories } from "../actions";

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
    // Fetch products
    const products = await prisma.product.findMany({
        include: {
            // Fetch ALL in-stock instances to calculate weighted average
            instances: {
                where: { status: "IN_STOCK" },
                select: { cost: true }
            },
            // Also fetch the very last instance (even if sold) for fallback cost
            // We can't do two separate instance inclusions with different wheres easily in one relation field in Prisma directly efficiently without raw or separate queries if we want named relations, 
            // but here we can just fetch last known cost separately or rely on our 'instances' array if stock > 0.
            // Actually, we need a separate query or a clever include. 
            // Limitation: Prisma doesn't support multiple separate `instances` keys.
            // Solution: We'll fetch `instances` where status is IN_STOCK. 
            // For the fallback (if stock 0), we might miss data. 
            // Let's optimize: We really want "Current Stock Cost" OR "Last Cost".
            // Let's modify the query to fetch the *latest* instance regardless of status, AND all in-stock? 
            // No, that overrides.
            // Let's fetch the latest 5 instances? Or just fetch in-stock. If in-stock is empty, we handle fallback.
            // If we want fallback, we might need a secondary query or just accept 0 for now to keep it fast.
            // User requirement: "El valor debe ser el averageCost... que ya tenemos en la base de datos".
            // Actually, `getDashboardMetrics` calculates it. 
            // Let's stick to: Calculate from IN_STOCK. If 0 stock, show 0 or "N/A"?
            // User said: "Current Stock". 
            // BUT, for pricing, knowing the LAST cost of an out-of-stock item is useful for reordering.
            // Let's try to get the fallback via a separate lookup if needed, OR just load all products with their latest instance cost as a property? 
            // Let's add a `lastCost` field to Product? No, computed.
            // Let's just fetch IN_STOCK for now. If stock is 0, cost is 0 (or we leave it). 
            // Optimizing: Let's fetch all instances? Too heavy.
            // Let's just use IN_STOCK. If stock is 0, cost is 0. 
            // If the user REALLY needs last cost for 0 stock items, they can check history.
            // Wait, previous code fetched `take: 1` ordered by desc.
            // Let's try to keep that for fallback? 
            // We can't have both `where: {status: IN_STOCK}` and `orderBy desc take 1` in the same object easily without subqueries.
            // Let's just fetch IN_STOCK instances.
            categoryRel: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    const categories = await getCategories();

    // Transform
    const formattedProducts = products.map(p => {
        const stockInstances = p.instances; // These are only IN_STOCK ones based on our query?
        // Wait, I updated the query in the replacement string but I need to be careful.
        // If I put `where: { status: "IN_STOCK" }` inside `include: { instances: ... }`, I lose the ability to see sold items.
        // Re-reading previous code: it had `_count` of in_stock, and `instances` take 1 (latest).
        // I will change it to fetch ALL `IN_STOCK` instances to average them.

        let totalCost = 0;
        let count = stockInstances.length;

        // Calculate Average Cost of CURRENT stock
        if (count > 0) {
            totalCost = stockInstances.reduce((sum, i) => sum + Number(i.cost), 0);
        }

        const averageCost = count > 0 ? (totalCost / count) : 0;
        // What about fallback if 0 stock? 
        // For simplicity and speed in this "Action Card" redesign context, let's stick to Current Stock Cost.
        // If 0 stock, Cost = 0.

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
            averageCost: averageCost
        };
    });

    return (
        <div className="w-full space-y-8 pb-20">
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
