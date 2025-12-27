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
            _count: {
                select: {
                    instances: {
                        where: { status: "IN_STOCK" }
                    }
                }
            },
            instances: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { cost: true }
            },
            categoryRel: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    const categories = await getCategories();

    // Transform
    const formattedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        category: p.category || (p.categoryRel?.name ?? "Sin Categoría"),
        upc: p.upc,
        stock: p._count.instances,
        status: p._count.instances > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        basePrice: Number(p.basePrice),
        lastCost: Number(p.instances[0]?.cost || 0)
    }));

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
