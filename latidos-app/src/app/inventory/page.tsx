import { prisma } from "@/lib/prisma";
import InventoryTable from "./InventoryTable";
import InventoryHeaderActions from "./InventoryHeaderActions";
import { getCategories } from "./actions";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    // Fetch products from real DB
    const products = await prisma.product.findMany({
        include: {
            // Count instances for stock
            _count: {
                select: {
                    instances: {
                        where: { status: "IN_STOCK" }
                    }
                }
            },
            // Get latest instance for cost calculation
            instances: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { cost: true }
            },
            categoryRel: true
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    const categories = await getCategories();

    // Transform data for the table
    const formattedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        category: p.category || (p.categoryRel?.name ?? "Sin Categoría"),
        upc: p.upc,
        stock: p._count.instances, // Dynamic stock count
        status: p._count.instances > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        basePrice: Number(p.basePrice),
        lastCost: Number(p.instances[0]?.cost || 0)
    }));

    return (
        <div className="w-full space-y-8">
            <div className="mb-8">
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                    Inventario Maestro
                </h1>
                <p className="text-slate-500 font-medium">Gestión Centralizada de Stock y Precios</p>
            </div>

            <InventoryHeaderActions />

            <InventoryTable initialProducts={formattedProducts} allCategories={categories} />
        </div>
    );
}
