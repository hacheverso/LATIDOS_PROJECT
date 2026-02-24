"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getTeamPerformanceStats(startDate?: Date, endDate?: Date) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) throw new Error("No organization found");

    // Helper to build date filters
    const dateFilter = startDate && endDate ? {
        createdAt: {
            gte: startDate,
            lte: endDate
        }
    } : {};

    const dateFilterDate = startDate && endDate ? {
        date: {
            gte: startDate,
            lte: endDate
        }
    } : {};


    // 1. Fetch Logistics Team Performance
    const logisticsUsers = await prisma.user.findMany({
        where: {
            organizationId: orgId,
            role: "LOGISTICA",
            status: "ACTIVE"
        }
    });

    const logisticsStats = await Promise.all(
        logisticsUsers.map(async (user: any) => {
            // Pending Deliveries (Sales assigned)
            const pendingDeliveries = await prisma.sale.count({
                where: {
                    organizationId: orgId,
                    assignedToId: user.id,
                    deliveryStatus: { not: "DELIVERED" },
                    deliveryMethod: "DELIVERY",
                    ...dateFilter
                }
            });

            // Completed Deliveries (Sales delivered)
            const completedDeliveries = await prisma.sale.count({
                where: {
                    organizationId: orgId,
                    assignedToId: user.id,
                    deliveryStatus: "DELIVERED",
                    deliveryMethod: "DELIVERY",
                    ...dateFilter
                }
            });

            // Completed Logistics Tasks
            const completedTasks = await prisma.logisticsTask.count({
                where: {
                    organizationId: orgId,
                    assignedToId: user.id,
                    status: "COMPLETED",
                    ...dateFilter
                }
            });

            return {
                id: user.id,
                name: user.name,
                role: "LOGISTICA",
                stats: {
                    pendingDeliveries,
                    completedDeliveries,
                    completedTasks,
                    totalCompleted: completedDeliveries + completedTasks
                }
            };
        })
    );

    // 2. Fetch Office/Operators Performance (using Dual ID)
    const operators = await prisma.operator.findMany({
        where: {
            organizationId: orgId,
            isActive: true
        }
    });

    const operatorStats = await Promise.all(
        operators.map(async (operator) => {
            // Sales Processed
            const salesProcessed = await prisma.sale.count({
                where: {
                    organizationId: orgId,
                    operatorId: operator.id,
                    ...dateFilter
                }
            });

            // Payments Processed
            const paymentsProcessed = await prisma.payment.count({
                where: {
                    organizationId: orgId,
                    operatorId: operator.id,
                    ...dateFilterDate
                }
            });

            // Purchases Logged
            const purchasesProcessed = await prisma.purchase.count({
                where: {
                    organizationId: orgId,
                    operatorId: operator.id,
                    ...dateFilterDate
                }
            });

            // Stock Adjustments
            const stockAdjustments = await prisma.stockAdjustment.count({
                where: {
                    organizationId: orgId,
                    operatorId: operator.id,
                    ...dateFilter
                }
            });

            // Audits Logged/Edited
            const auditsProcessed = await prisma.saleAudit.count({
                where: {
                    operatorId: operator.id,
                    ...dateFilter
                }
            });

            return {
                id: operator.id,
                name: operator.name,
                role: "OPERADOR (PIN)",
                stats: {
                    salesProcessed,
                    paymentsProcessed,
                    purchasesProcessed,
                    stockAdjustments,
                    auditsProcessed,
                    totalInteractions: salesProcessed + paymentsProcessed + purchasesProcessed + stockAdjustments + auditsProcessed
                }
            };
        })
    );

    return {
        logistics: logisticsStats.sort((a, b) => b.stats.totalCompleted - a.stats.totalCompleted),
        operators: operatorStats.sort((a, b) => b.stats.totalInteractions - a.stats.totalInteractions)
    };
}
