"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import { PrismaClient } from "@prisma/client";

// Use local client to bypass cache issues
export async function saveAudit(data: { productId: string; physicalCount: number; observations: string }[]) {
    const prisma = new PrismaClient(); // Local instance
    try {
        const session = await auth();
        // @ts-ignore
        const orgId = session?.user?.organizationId;
        const userId = session?.user?.id;

        if (!orgId || !userId) return { success: false, error: "No autorizado" };

        if (!data || data.length === 0) return { success: false, error: "No hay datos para guardar" };

        // Create Audit Record
        const totalCounted = data.length;

        // Fetch current system stock for accurate discrepancy calculation snapshot
        // Efficient: Fetch all product IDs
        const productIds = data.map(d => d.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, organizationId: orgId },
            select: { id: true, _count: { select: { instances: { where: { status: 'IN_STOCK' } } } } }
        });

        const stockMap = new Map<string, number>();
        products.forEach(p => stockMap.set(p.id, p._count.instances));

        let discrepancies = 0;
        const details = data.map(item => {
            const system = stockMap.get(item.productId) || 0;
            const diff = item.physicalCount - system;
            if (diff !== 0) discrepancies++;
            return {
                productId: item.productId,
                systemStock: system,
                physicalCount: item.physicalCount,
                difference: diff,
                observations: item.observations
            };
        });

        await prisma.stockAudit.create({
            data: {
                organizationId: orgId,
                userId: userId,
                productsCounted: totalCounted,
                discrepanciesFound: discrepancies,
                details: details as unknown as any, // Prisma handles JSON
            }
        });

        revalidatePath("/inventory/audit");
        return { success: true };

    } catch (error) {
        console.error("Audit Save Error details:", error);

        let msg = "Error al guardar.";
        // @ts-ignore
        if (error?.message) msg = error.message;

        return { success: false, error: msg };
    } finally {
        await prisma.$disconnect();
    }
}
