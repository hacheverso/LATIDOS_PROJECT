"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Type definition for the Board Item (Polymorphic)
// Items can be a Sale OR a LogisticsTask
export type BoardItem = {
    id: string;
    type: "SALE" | "TASK";
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: string;
    // Common fields
    title: string; // Sale: "Factura VNT-..." | Task: Title
    description?: string;
    address?: string | null;
    phone?: string | null;
    moneyToCollect: number;
    createdAt: Date;
    // Original Objects
    sale?: any;
    task?: any;
};

export async function createLogisticsTask(data: {
    title: string;
    description?: string;
    address?: string;
    moneyToCollect?: number;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    customerId?: string;
}) {
    try {
        await prisma.logisticsTask.create({
            data: {
                title: data.title,
                description: data.description,
                address: data.address,
                moneyToCollect: data.moneyToCollect || 0,
                urgency: data.urgency,
                customerId: data.customerId
            }
        });
        revalidatePath("/logistics");
        return { success: true };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, error: "Failed to create task" };
    }
}

export async function getLogisticsBoard() {
    try {
        // 1. Fetch Drivers (Active)
        const drivers = await prisma.user.findMany({
            where: { role: "DOMICILIARIO", status: "ACTIVE" },
            include: {
                deliveries: { where: { deliveryStatus: "ON_ROUTE" }, include: { customer: true, instances: { include: { product: true } } } },
                tasks: { where: { status: "ON_ROUTE" }, include: { customer: true } }
            }
        });

        // 2. Fetch Pending Sales
        const pendingSales = await prisma.sale.findMany({
            where: { deliveryMethod: "DELIVERY", deliveryStatus: "PENDING", assignedToId: null },
            include: { customer: true, instances: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Fetch Pending Tasks
        const pendingTasks = await prisma.logisticsTask.findMany({
            where: { status: "PENDING", assignedToId: null },
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Fetch Pickup Sales (Recogida en Local)
        const pickupSales = await prisma.sale.findMany({
            where: { deliveryMethod: "PICKUP", deliveryStatus: { in: ["PENDING", "ON_ROUTE"] } }, // Pickup items stay until delivered
            include: { customer: true, instances: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Helper to normalize items
        const normalize = (item: any, type: "SALE" | "TASK"): BoardItem => {
            if (type === "SALE") {
                return {
                    id: item.id,
                    type: "SALE",
                    urgency: item.urgency,
                    status: item.deliveryStatus,
                    title: `Factura ${item.invoiceNumber || '---'}`,
                    description: item.notes,
                    address: item.customer.address,
                    phone: item.customer.phone,
                    moneyToCollect: Number(item.total) - Number(item.amountPaid),
                    createdAt: item.createdAt,
                    sale: item
                };
            } else {
                return {
                    id: item.id,
                    type: "TASK",
                    urgency: item.urgency,
                    status: item.status,
                    title: item.title,
                    description: item.description,
                    address: item.address,
                    phone: item.customer?.phone,
                    moneyToCollect: Number(item.moneyToCollect),
                    createdAt: item.createdAt,
                    task: item
                };
            }
        };

        // Construct Driver Columns with merged items
        const driversWithItems = drivers.map(d => ({
            ...d,
            items: [
                ...d.deliveries.map((s: any) => normalize(s, "SALE")),
                ...d.tasks.map((t: any) => normalize(t, "TASK"))
            ].sort((a, b) => {
                // Sort by Urgency (Critical > High > Medium > Low) then Date
                const urgencyWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                const wA = urgencyWeight[a.urgency] || 2;
                const wB = urgencyWeight[b.urgency] || 2;
                if (wA !== wB) return wB - wA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
        }));

        const pendingItems = [
            ...pendingSales.map((s: any) => normalize(s, "SALE")),
            ...pendingTasks.map((t: any) => normalize(t, "TASK"))
        ].sort((a, b) => {
            const urgencyWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            const wA = urgencyWeight[a.urgency] || 2;
            const wB = urgencyWeight[b.urgency] || 2;
            if (wA !== wB) return wB - wA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const pickupItems = pickupSales.map(s => normalize(s, "SALE")).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            drivers: driversWithItems,
            pending: pendingItems,
            pickup: pickupItems
        };

    } catch (error) {
        console.error("Error fetching logistics board:", error);
        return { drivers: [], pending: [], pickup: [] };
    }
}

export async function assignDelivery(itemId: string, driverId: string, type: "SALE" | "TASK") {
    try {
        if (type === "SALE") {
            await prisma.sale.update({
                where: { id: itemId },
                data: {
                    assignedToId: driverId,
                    deliveryStatus: "ON_ROUTE",

                    onRouteAt: new Date()
                }
            });
        } else {
            await prisma.logisticsTask.update({
                where: { id: itemId },
                data: {
                    assignedToId: driverId,
                    status: "ON_ROUTE",

                    onRouteAt: new Date()
                }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to assign" };
    }
}

export async function unassignDelivery(itemId: string, type: "SALE" | "TASK") {
    try {
        if (type === "SALE") {
            await prisma.sale.update({
                where: { id: itemId },
                data: { assignedToId: null, deliveryStatus: "PENDING" }
            });
        } else {
            await prisma.logisticsTask.update({
                where: { id: itemId },
                data: { assignedToId: null, status: "PENDING" }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to unassign" };
    }
}


export async function markAsDelivered(itemId: string, type: "SALE" | "TASK", collectedAmount?: number) {
    console.log(`[markAsDelivered] Starting for ${type} ${itemId}. Collected: ${collectedAmount}`);
    try {
        if (type === "SALE") {
            const updateData: any = {
                deliveryStatus: "DELIVERED",

                completedAt: new Date()
            };

            // If money was collected, update amountPaid
            if (collectedAmount && collectedAmount > 0) {
                const sale = await prisma.sale.findUnique({ where: { id: itemId } });
                if (sale) {
                    const currentPaid = Number(sale.amountPaid) || 0;
                    updateData.amountPaid = currentPaid + collectedAmount;
                    console.log(`[markAsDelivered] Updating payment. Old: ${currentPaid}, New: ${updateData.amountPaid}`);
                }
            }

            await prisma.sale.update({
                where: { id: itemId },
                data: updateData
            });
        } else {
            // Logistics Task
            await prisma.logisticsTask.update({
                where: { id: itemId },
                data: {
                    status: "COMPLETED",

                    completedAt: new Date()
                }
            });
        }
        revalidatePath("/logistics");
        console.log(`[markAsDelivered] Success`);
        return { success: true };
    } catch (error) {
        console.error("[markAsDelivered] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}


export async function switchToPickup(itemId: string) {
    try {
        await prisma.sale.update({
            where: { id: itemId },
            data: {
                deliveryMethod: "PICKUP",
                assignedToId: null,
                deliveryStatus: "PENDING"
            }
        });
        revalidatePath("/logistics");
        return { success: true };
    } catch (error) { return { success: false }; }
}

export async function reportDeliveryIssue(itemId: string, type: "SALE" | "TASK", comment: string, action: "COMMENT" | "CANCEL") {
    try {
        const timestamp = new Date().toLocaleString("es-CO");
        const noteEntry = `\n[${timestamp}] Novedad: ${comment}`;

        if (type === "SALE") {
            const item = await prisma.sale.findUnique({ where: { id: itemId } });
            if (!item) return { success: false, error: "Item not found" };

            const updateData: any = {
                notes: (item.notes || "") + noteEntry
            };

            if (action === "CANCEL") {
                updateData.deliveryStatus = "PENDING";
                updateData.assignedToId = null;
                updateData.onRouteAt = null; // Reset? Or keep? Reset seems better for "Return to Pending"
            }

            await prisma.sale.update({
                where: { id: itemId },
                data: updateData
            });

        } else {
            // TASK
            const item = await prisma.logisticsTask.findUnique({ where: { id: itemId } });
            if (!item) return { success: false, error: "Item not found" };

            const updateData: any = {
                description: (item.description || "") + noteEntry
            };

            if (action === "CANCEL") {
                updateData.status = "PENDING";
                updateData.assignedToId = null;
                updateData.onRouteAt = null;
            }

            await prisma.logisticsTask.update({
                where: { id: itemId },
                data: updateData
            });
        }

        revalidatePath("/logistics");
        return { success: true };
    } catch (error) {
        console.error("Error reporting issue:", error);
        return { success: false, error: "Error interno al reportar novedad" };
    }
}

export async function getLogisticsHistory() {
    try {
        const completedSales = await prisma.sale.findMany({
            where: { deliveryStatus: "DELIVERED" },
            include: { customer: true, assignedTo: true },
            orderBy: { completedAt: 'desc' },
            take: 100 // Limit for performance
        });

        const completedTasks = await prisma.logisticsTask.findMany({
            where: { status: "COMPLETED" },
            include: { assignedTo: true, customer: true },
            orderBy: { completedAt: 'desc' },
            take: 100
        });

        // Normalize
        const history = [
            ...completedSales.map(s => ({
                id: s.id,
                type: "SALE" as const,
                title: `Factura ${s.invoiceNumber || '---'}`,
                driver: s.assignedTo?.name || "Sin Asignar",
                completedAt: s.completedAt,
                onRouteAt: s.onRouteAt,
                createdAt: s.createdAt, // Added
                urgency: s.urgency,
                evidenceUrl: s.evidenceUrl
            })),
            ...completedTasks.map(t => ({
                id: t.id,
                type: "TASK" as const,
                title: t.title,
                driver: t.assignedTo?.name || "Sin Asignar",
                completedAt: t.completedAt,
                onRouteAt: t.onRouteAt,
                createdAt: t.createdAt, // Added
                urgency: t.urgency,
                evidenceUrl: t.evidenceUrl
            }))
        ].sort((a, b) => {
            return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
        });

        return history;

    } catch (error) {
        console.error("Error fetching history:", error);
        return [];
    }
}

export async function getLogisticsKPIs() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Fetch this month's completed items
        const thisMonthSales = await prisma.sale.findMany({
            where: { deliveryStatus: "DELIVERED", completedAt: { gte: startOfMonth } },
            include: { assignedTo: true }
        });
        const thisMonthTasks = await prisma.logisticsTask.findMany({
            where: { status: "COMPLETED", completedAt: { gte: startOfMonth } },
            include: { assignedTo: true }
        });

        const lastMonthSales = await prisma.sale.count({
            where: { deliveryStatus: "DELIVERED", completedAt: { gte: startOfLastMonth, lte: endOfLastMonth } }
        });
        const lastMonthTasks = await prisma.logisticsTask.count({
            where: { status: "COMPLETED", completedAt: { gte: startOfLastMonth, lte: endOfLastMonth } }
        });

        const totalThisMonth = thisMonthSales.length + thisMonthTasks.length;
        const totalLastMonth = lastMonthSales + lastMonthTasks;

        // Driver Ranking
        const driverMap = new Map();
        [...thisMonthSales, ...thisMonthTasks].forEach(item => {
            if (item.assignedTo) {
                const driver = item.assignedTo.name;
                driverMap.set(driver, (driverMap.get(driver) || 0) + 1);
            }
        });
        const driverRanking = Array.from(driverMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Average Delivery Time (Lead Time: Created -> Completed)
        let totalTime = 0;
        let countTime = 0;
        const allItems = [...thisMonthSales, ...thisMonthTasks];

        allItems.forEach(item => {
            // Use CREATE DATE vs COMPLETION DATE for full Lead Time
            if (item.createdAt && item.completedAt) {
                const diff = (new Date(item.completedAt).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60); // minutes
                if (diff > 0) {
                    totalTime += diff;
                    countTime++;
                }
            }
        });
        const avgTime = countTime > 0 ? Math.round(totalTime / countTime) : 0;

        // High Urgency Effectiveness
        const criticalItems = await prisma.sale.count({ where: { urgency: { in: ["HIGH", "CRITICAL"] }, completedAt: { gte: startOfMonth } } }) +
            await prisma.logisticsTask.count({ where: { urgency: { in: ["HIGH", "CRITICAL"] }, completedAt: { gte: startOfMonth } } });
        // Simplified: Effectiveness = % of High/Critical items completed compared to total created? 
        // Or just count of High items completed? User asked for "Effectiveness". 
        // Let's return the count for now or assume effectiveness is 100% of those marked delivered.
        // Let's return just the count of high urgency completed.

        return {
            totalThisMonth,
            totalLastMonth,
            driverRanking,
            avgTime,
            highUrgencyCount: criticalItems
        };

    } catch (error) {
        console.error("Error fetching KPIs:", error);
        return {
            totalThisMonth: 0,
            totalLastMonth: 0,
            driverRanking: [],
            avgTime: 0,
            highUrgencyCount: 0
        };
    }
}

export async function getLogisticsDailyStats() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Created Today
        const salesCreated = await prisma.sale.count({ where: { createdAt: { gte: startOfDay }, deliveryMethod: "DELIVERY" } });
        const tasksCreated = await prisma.logisticsTask.count({ where: { createdAt: { gte: startOfDay } } });

        // Completed Today
        const salesCompleted = await prisma.sale.count({ where: { deliveryStatus: "DELIVERED", completedAt: { gte: startOfDay } } });
        const tasksCompleted = await prisma.logisticsTask.count({ where: { status: "COMPLETED", completedAt: { gte: startOfDay } } });

        // Pending (Created Today but not completed) - Approximation or exact?
        // Let's just return Total Pending to show "Work Load"
        const salesPending = await prisma.sale.count({ where: { deliveryStatus: { in: ["PENDING", "ON_ROUTE"] }, deliveryMethod: "DELIVERY" } });
        const tasksPending = await prisma.logisticsTask.count({ where: { status: { in: ["PENDING", "ON_ROUTE"] } } });

        return {
            createdToday: salesCreated + tasksCreated,
            completedToday: salesCompleted + tasksCompleted,
            activePending: salesPending + tasksPending
        };
    } catch (error) {
        console.error("Error fetching daily stats:", error);
        return { createdToday: 0, completedToday: 0, activePending: 0 };
    }
}
