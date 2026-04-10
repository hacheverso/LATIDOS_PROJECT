"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getCategories } from "../actions";

export async function getCatalogProducts(params: { page?: number, query?: string, stock?: string, sort?: string, direction?: string, category?: string, pageSize?: string }) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) throw new Error("No autorizado");

    const pageSize = params.pageSize === 'all' ? 10000 : (Number(params.pageSize) || 50);
    const currentPage = Number(params.page) || 1;
    const skip = (currentPage - 1) * pageSize;

    const stockStatus = params.stock || "in_stock";
    const baseWhere: any = {
        organizationId: orgId,
        name: { not: "SALDO INICIAL MIGRACION" }
    };

    if (stockStatus === "in_stock") {
        baseWhere.instances = { some: { status: "IN_STOCK" } };
    } else if (stockStatus === "out_of_stock") {
        baseWhere.instances = { none: { status: "IN_STOCK" } };
    }

    if (params.category && params.category !== 'ALL') {
        baseWhere.category = params.category;
    }

    if (params.query) {
        const lowerTerm = params.query.trim();
        baseWhere.OR = [
            { name: { contains: lowerTerm, mode: 'insensitive' } },
            { sku: { contains: lowerTerm, mode: 'insensitive' } },
            { upc: { contains: lowerTerm, mode: 'insensitive' } },
            { category: { contains: lowerTerm, mode: 'insensitive' } },
        ];
    }

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

    const sortField = params.sort || 'stock';
    const sortDir = params.direction === 'asc' ? 'asc' : 'desc';

    if (sortField === 'stock') {
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

        const dir = sortDir === 'asc' ? 1 : -1;
        mapped.sort((a, b) => (a.stock - b.stock) * dir);

        const paginatedIds = mapped.slice(skip, skip + pageSize).map(m => m.id);

        productsQuery.where = { id: { in: paginatedIds } };
        delete productsQuery.skip;
        delete productsQuery.take;
        delete productsQuery.orderBy;
    } else if (['name', 'sku', 'upc', 'basePrice', 'category', 'updatedAt'].includes(sortField)) {
        productsQuery.orderBy = { [sortField]: sortDir };
    } else {
        productsQuery.orderBy = { updatedAt: 'desc' };
    }

    const [productsRaw, totalCount, outOfStockCount] = await Promise.all([
        prisma.product.findMany(productsQuery),
        prisma.product.count({ where: baseWhere }),
        prisma.product.count({
            where: {
                organizationId: orgId,
                instances: { none: { status: "IN_STOCK" } }
            }
        })
    ]);

    let products = productsRaw;
    if (sortField === 'stock') {
        const dir = sortDir === 'asc' ? 1 : -1;
        products.sort((a: any, b: any) => {
            const stockA = a.instances.length;
            const stockB = b.instances.length;
            return (stockA - stockB) * dir;
        });
    }

    const categories = await getCategories();

    const outOfStockIds = products.filter((p: any) => p.instances.length === 0).map((p: any) => p.id);
    let lastCosts: Record<string, number> = {};

    if (outOfStockIds.length > 0) {
        const lastInstances = await prisma.instance.findMany({
            where: { productId: { in: outOfStockIds } },
            orderBy: [{ productId: 'asc' }, { createdAt: 'desc' }],
            distinct: ['productId'],
            select: { productId: true, cost: true }
        });

        lastCosts = lastInstances.reduce((acc, curr) => ({ ...acc, [curr.productId]: Number(curr.cost || 0) }), {});
    }

    const formattedProducts = products.map((p: any) => {
        const stockInstances = p.instances;

        let totalCost = 0;
        let count = stockInstances.length;
        let averageCost = 0;
        let isLastKnownCost = false;

        if (count > 0) {
            totalCost = stockInstances.reduce((sum: number, i: any) => sum + Number(i.cost), 0);
            averageCost = totalCost / count;
        } else {
            if (lastCosts[p.id]) {
                averageCost = lastCosts[p.id];
                isLastKnownCost = true;
            }
        }

        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category || (p.categoryRel?.name ?? "Sin Categoría"),
            upc: p.upc,
            stock: count,
            status: count > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
            basePrice: Number(p.basePrice),
            averageCost: averageCost,
            isLastKnownCost: isLastKnownCost,
            imageUrl: p.imageUrl
        };
    });

    return { formattedProducts, totalCount, outOfStockCount, categories };
}
