import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import InventoryTable from "../InventoryTable";
import InventoryHeaderActions from "../InventoryHeaderActions";
import { getCategories } from "../actions";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
    searchParams
}: {
    searchParams: { page?: string, query?: string, stock?: string, sort?: string, direction?: string, category?: string, pageSize?: string }
}) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) return <div>No autorizado</div>;

    const pageSize = searchParams.pageSize === 'all' ? 10000 : (Number(searchParams.pageSize) || 50);
    const currentPage = Number(searchParams.page) || 1;
    const skip = (currentPage - 1) * pageSize;

    const stockStatus = searchParams.stock || "in_stock";

    // Base where clause for products
    const baseWhere: any = { organizationId: orgId };

    if (stockStatus === "in_stock") {
        baseWhere.instances = {
            some: { status: "IN_STOCK" }
        };
    } else if (stockStatus === "out_of_stock") {
        baseWhere.instances = {
            none: { status: "IN_STOCK" }
        };
    }

    if (searchParams.category && searchParams.category !== 'ALL') {
        baseWhere.category = searchParams.category;
    }

    if (searchParams.query) {
        const lowerTerm = searchParams.query.trim();
        baseWhere.OR = [
            { name: { contains: lowerTerm, mode: 'insensitive' } },
            { sku: { contains: lowerTerm, mode: 'insensitive' } },
            { upc: { contains: lowerTerm, mode: 'insensitive' } },
            { category: { contains: lowerTerm, mode: 'insensitive' } },
        ];
    }

    type ProductWithRelations = any; // Fallback to any to avoid complex Prisma imports here

    let productsQuery: any = {
        where: baseWhere,
        include: {
            instances: {
                where: { status: "IN_STOCK" },
                select: { cost: true }
            },
            categoryRel: true
        },
        skip,
        take: pageSize
    };

    if (searchParams.sort === 'stock') {
        const allProducts = await prisma.product.findMany({
            where: baseWhere,
            select: { id: true }
        });

        const stockCounts = await prisma.instance.groupBy({
            by: ['productId'],
            where: { status: "IN_STOCK", product: baseWhere },
            _count: { id: true }
        });

        const stockMap = new Map(stockCounts.map(s => [s.productId, s._count.id]));

        const mapped = allProducts.map(p => ({
            id: p.id,
            stock: stockMap.get(p.id) || 0
        }));

        const dir = searchParams.direction === 'asc' ? 1 : -1;
        mapped.sort((a, b) => (a.stock - b.stock) * dir);

        const paginatedIds = mapped.slice(skip, skip + pageSize).map(m => m.id);

        productsQuery.where = { id: { in: paginatedIds } };
        delete productsQuery.skip;
        delete productsQuery.take;
        delete productsQuery.orderBy;
    } else {
        productsQuery.orderBy = { updatedAt: 'desc' };
    }

    // Fetch paginated products, total count based on filter, and the global out of stock count
    const [productsRaw, totalCount, outOfStockCount] = await Promise.all([
        prisma.product.findMany(productsQuery) as Promise<ProductWithRelations[]>,
        prisma.product.count({ where: baseWhere }),
        prisma.product.count({
            where: {
                organizationId: orgId,
                instances: { none: { status: "IN_STOCK" } }
            }
        })
    ]);

    let products = productsRaw;
    if (searchParams.sort === 'stock') {
        const dir = searchParams.direction === 'asc' ? 1 : -1;
        products.sort((a: any, b: any) => {
            const stockA = a.instances.length;
            const stockB = b.instances.length;
            return (stockA - stockB) * dir;
        });
    }

    const categories = await getCategories();

    // 2. Fetch "Last Known Cost" for Out-of-Stock items (ONLY for the paginated result)
    const outOfStockIds = products.filter((p: any) => p.instances.length === 0).map((p: any) => p.id);
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
    const formattedProducts = products.map((p: any) => {
        const stockInstances = p.instances;

        let totalCost = 0;
        let count = stockInstances.length;
        let averageCost = 0;
        let isLastKnownCost = false;

        // Calculate Average Cost of CURRENT stock
        if (count > 0) {
            totalCost = stockInstances.reduce((sum: number, i: any) => sum + Number(i.cost), 0);
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
                <InventoryTable initialProducts={formattedProducts} allCategories={categories} totalCount={totalCount} outOfStockCount={outOfStockCount} />
            </div>
        </div>
    );
}
