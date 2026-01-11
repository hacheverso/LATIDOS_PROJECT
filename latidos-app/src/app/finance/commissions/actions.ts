"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function getCommissionsReport(monthFilter?: Date) {
    const orgId = await getOrgId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
        include: {
            // @ts-ignore
            sales: {
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    },
                    organizationId: orgId
                },
                include: {
                    instances: true // Note: instances don't have direct orgId but sales do.
                }
            }
        }
    });

    const report = users.map(user => {
        let totalSales = 0;
        let totalCost = 0;

        // @ts-ignore
        user.sales.forEach(sale => {
            totalSales += Number(sale.total);
            // Cost calculation: Check instances
            // @ts-ignore
            sale.instances.forEach((instance: any) => {
                totalCost += Number(instance.cost || 0);
            });
        });

        const netProfit = totalSales - totalCost;
        // @ts-ignore
        const commissionRate = user.commissionPercentage || 0;
        const commissionAmount = netProfit * (commissionRate / 100);

        return {
            id: user.id,
            name: user.name,
            totalSales,
            totalCost,
            netProfit,
            commissionRate,
            commissionAmount,
            // @ts-ignore
            saleCount: user.sales.length
        };
    });

    return {
        report: report.sort((a, b) => b.commissionAmount - a.commissionAmount),
        period: startOfMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    };
}
