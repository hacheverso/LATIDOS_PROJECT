"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCommissionsReport(monthFilter?: Date) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        include: {
            // @ts-ignore
            sales: {
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                include: {
                    instances: true
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
                // Use soldPrice? Or originalCost? Net Profit = Sale Price - Cost
                // If soldPrice is not set (legacy), use sale total / items? No, we have soldPrice
                // Cost: originalCost ?? cost ?? 0
                // We need to fetch cost from instances.
                // Instance has `cost` field.
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
