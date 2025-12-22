import { prisma } from "@/lib/prisma";
import InventoryTable from "./InventoryTable";
import InventoryHeaderActions from "./InventoryHeaderActions";
import { getCategories } from "./actions";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    // Fetch products from real DB
    const products = await prisma.product.findMany({
        include: {
            // Include instances to calculate stock
            instances: {
                where: {
                    status: "IN_STOCK"
                }
            }
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
        category: p.category,
        upc: p.upc,
        stock: p.instances.length, // Dynamic stock count
        status: p.instances.length > 0 ? "IN_STOCK" : "OUT_OF_STOCK"
    }));

    return (
        <div className="max-w-7xl mx-auto space-y-8">
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
