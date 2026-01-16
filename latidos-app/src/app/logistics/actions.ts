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

// --- Types ---

export type BoardItem = {
    id: string;
    title: string;
    description?: string;
    address?: string;
    phone?: string;
    status: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    type: "SALE" | "TASK";
    moneyToCollect: number;
    createdAt: Date;
    sale?: {
        id: string;
        total: number;
        amountPaid: number;
        deliveryMethod: string;
        instances: any[];
        customer?: {
            name: string;
            phone: string;
            address: string;
            sector?: string | null;
        }
    };
    driverId?: string;
};

// --- Zone Actions ---

export async function getLogisticZones() {
    const orgId = await getOrgId();
    try {
        const zones = await prisma.logisticZone.findMany({
            where: { organizationId: orgId },
            orderBy: { name: 'asc' }
        });
        return zones;
    } catch (error) {
        console.error("Error fetching zones:", error);
        return [];
    }
}

export async function createLogisticZone(name: string) {
    const orgId = await getOrgId();
    try {
        const zone = await prisma.logisticZone.create({
            data: { name: name.trim(), organizationId: orgId }
        });
        revalidatePath("/logistics");
        return { success: true, zone };
    } catch (error) {
        return { success: false, error: "Failed to create zone" };
    }
}

// Seed function -> Likely needs to be organization aware if called. 
// Standard practice: "seed" runs once for system. But here zones are per Org. 
// We can skip auto-seeding for now or seed on Org creation.
export async function seedLogisticZones() {
    // Disabled / Manual only for now to avoid pollution
}

// --- Board Actions ---

export async function getLogisticsBoard() {
    const orgId = await getOrgId();

    // 1. Fetch Drivers (Only LOGISTICA, in THIS Org)
    const drivers = await prisma.user.findMany({
        where: {
            role: { in: ["LOGISTICA"] },
            organizationId: orgId
        },
        select: { id: true, name: true }
    });

    // 2. Fetch Active Deliveries (Pending or On Route) for this Org
    const activeSales = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { deliveryStatus: { in: ["PENDING", "ON_ROUTE"] } },
                { deliveryMethod: "PICKUP", deliveryStatus: "PENDING" } // Pickups waiting
            ]
        },
        include: {
            customer: true,
            instances: { include: { product: true } }
        },
        orderBy: { date: 'asc' }
    });

    const activeTasks = await prisma.logisticsTask.findMany({
        where: {
            status: { in: ["PENDING", "ON_ROUTE"] },
            organizationId: orgId
        },
        orderBy: { createdAt: 'asc' }
    });

    // 3. Map to Board Items
    const mapSaleToItem = (s: any): BoardItem => ({
        id: s.id,
        title: `Factura ${s.invoiceNumber || s.id.slice(0, 8)}`,
        description: s.notes,
        address: s.customer?.address || "Sin dirección",
        phone: s.customer?.phone,
        status: s.deliveryStatus,
        urgency: s.urgency,
        type: "SALE",
        moneyToCollect: Number(s.total) - Number(s.amountPaid), // Balance
        createdAt: s.date,
        sale: {
            id: s.id,
            total: Number(s.total),
            amountPaid: Number(s.amountPaid),
            deliveryMethod: s.deliveryMethod,
            instances: s.instances,
            customer: s.customer
        },
        // @ts-ignore
        driverId: s.driverId || s.assignedToId
    });

    const mapTaskToItem = (t: any): BoardItem => ({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        address: t.address || undefined,
        status: t.status,
        urgency: t.urgency,
        type: "TASK",
        moneyToCollect: Number(t.moneyToCollect || 0),
        createdAt: t.createdAt,
        // @ts-ignore
        driverId: t.driverId || t.assignedToId
    });

    const allItems = [
        ...activeSales.map(mapSaleToItem),
        ...activeTasks.map(mapTaskToItem)
    ];

    // 4. Buckets
    const pending = allItems.filter(i =>
        (i.status === "PENDING" && i.sale?.deliveryMethod !== "PICKUP") || // Standard Pending
        (i.sale?.deliveryMethod === "PICKUP" && i.status === "PENDING")   // Pickup Pending
    ).sort((a, b) => {
        const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const wA = urgencyWeight[a.urgency] || 2;
        const wB = urgencyWeight[b.urgency] || 2;
        if (wA !== wB) return wB - wA;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Oldest first
    });

    const pickup: BoardItem[] = [];

    // 5. Completed Bucket (TODAY Only)
    const todayStart = new Date();
    todayStart.setUTCHours(5, 0, 0, 0);
    if (new Date() < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
    }

    const completedSales = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            deliveryStatus: "DELIVERED",
            completedAt: { gte: todayStart }
        },
        include: {
            customer: true,
            instances: { include: { product: true } }
        },
        orderBy: { completedAt: 'desc' }
    });

    const completedTasks = await prisma.logisticsTask.findMany({
        where: {
            organizationId: orgId,
            status: "COMPLETED",
            completedAt: { gte: todayStart }
        },
        orderBy: { completedAt: 'desc' }
    });

    const completedItems = [
        ...completedSales.map(mapSaleToItem),
        ...completedTasks.map(mapTaskToItem)
    ];

    // Drivers Buckets
    const driverBuckets = drivers.map(d => ({
        ...d,
        items: allItems.filter(i => i.driverId === d.id && i.status === "ON_ROUTE")
    }));

    return {
        drivers: driverBuckets,
        pending,
        pickup,
        completed: completedItems
    };
}

export async function getLogisticsDailyStats() {
    const orgId = await getOrgId();

    // Logic: Colombia UTC-5. 
    const todayStart = new Date();
    todayStart.setUTCHours(5, 0, 0, 0);
    if (new Date() < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
    }

    const createdSales = await prisma.sale.count({ where: { date: { gte: todayStart }, organizationId: orgId } });
    const createdTasks = await prisma.logisticsTask.count({ where: { createdAt: { gte: todayStart }, organizationId: orgId } });

    // Completed Today
    const completedSales = await prisma.sale.count({ where: { deliveryStatus: "DELIVERED", updatedAt: { gte: todayStart }, organizationId: orgId } });
    const completedTasks = await prisma.logisticsTask.count({ where: { status: "COMPLETED", updatedAt: { gte: todayStart }, organizationId: orgId } });

    // Active Pending
    const activeSales = await prisma.sale.count({ where: { deliveryStatus: { in: ["PENDING", "ON_ROUTE"] }, organizationId: orgId } });
    const activeTasksCount = await prisma.logisticsTask.count({ where: { status: { in: ["PENDING", "ON_ROUTE"] }, organizationId: orgId } });

    return {
        createdToday: createdSales + createdTasks,
        completedToday: completedSales + completedTasks,
        activePending: activeSales + activeTasksCount,
        averageTime: 45 // Placeholder
    };
}

// --- History & KPIs ---

export async function getLogisticsHistory() {
    const orgId = await getOrgId();

    const sales = await prisma.sale.findMany({
        where: { deliveryStatus: "DELIVERED", organizationId: orgId },
        include: {
            customer: true,
            assignedTo: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
    });

    const tasks = await prisma.logisticsTask.findMany({
        where: { status: "COMPLETED", organizationId: orgId },
        include: {
            assignedTo: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
    });

    // Merge and sort
    const history = [
        ...sales.map(s => ({
            id: s.id,
            type: "SALE" as const,
            title: `Factura ${s.invoiceNumber || s.id.slice(0, 8)}`,
            status: "DELIVERED",
            driver: s.assignedTo?.name || "Sin Asignar",
            urgency: s.urgency,
            createdAt: s.date,
            onRouteAt: s.onRouteAt,
            completedAt: s.updatedAt,
            evidenceUrl: s.evidenceUrl
        })),
        ...tasks.map(t => ({
            id: t.id,
            type: "TASK" as const,
            title: t.title,
            status: "COMPLETED",
            driver: t.assignedTo?.name || "Sin Asignar",
            urgency: t.urgency,
            createdAt: t.createdAt,
            onRouteAt: t.onRouteAt,
            completedAt: t.updatedAt,
            evidenceUrl: t.evidenceUrl
        }))
    ].sort((a, b) => {
        const ca = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const cb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return cb - ca;
    });

    return history;
}

export async function getLogisticsKPIs() {
    const orgId = await getOrgId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const countDeliveries = async (start: Date, end?: Date) => {
        const whereSale: any = { deliveryStatus: "DELIVERED", updatedAt: { gte: start }, organizationId: orgId };
        const whereTask: any = { status: "COMPLETED", updatedAt: { gte: start }, organizationId: orgId };

        if (end) {
            whereSale.updatedAt.lte = end;
            whereTask.updatedAt.lte = end;
        }

        const s = await prisma.sale.count({ where: whereSale });
        const t = await prisma.logisticsTask.count({ where: whereTask });
        return s + t;
    };

    const totalThisMonth = await countDeliveries(startOfMonth);
    const totalLastMonth = await countDeliveries(startOfLastMonth, endOfLastMonth);

    // Driver Ranking (This Month) - Using simple array aggregation for simplicity
    const salesThisMonth = await prisma.sale.findMany({
        where: { deliveryStatus: "DELIVERED", updatedAt: { gte: startOfMonth }, organizationId: orgId },
        include: { assignedTo: true }
    });
    const tasksThisMonth = await prisma.logisticsTask.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: startOfMonth }, organizationId: orgId },
        include: { assignedTo: true }
    });

    const rankingMap = new Map<string, number>();

    [...salesThisMonth, ...tasksThisMonth].forEach(item => {
        const name = item.assignedTo?.name || "Desconocido";
        rankingMap.set(name, (rankingMap.get(name) || 0) + 1);
    });

    const driverRanking = Array.from(rankingMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Calc Avg Time (Minutes)
    let totalMinutes = 0;
    let countWithTime = 0;

    [...salesThisMonth, ...tasksThisMonth].forEach(item => {
        if (item.onRouteAt && item.updatedAt) {
            const diff = (new Date(item.updatedAt).getTime() - new Date(item.onRouteAt).getTime()) / 60000;
            if (diff > 0 && diff < 1000) {
                totalMinutes += diff;
                countWithTime++;
            }
        }
    });

    const avgTime = countWithTime > 0 ? Math.round(totalMinutes / countWithTime) : 0;

    // High Urgency
    const highUrgencyCount = [...salesThisMonth, ...tasksThisMonth].filter(i =>
        i.urgency === "HIGH" || i.urgency === "CRITICAL"
    ).length;

    return {
        totalThisMonth,
        totalLastMonth,
        driverRanking,
        avgTime,
        highUrgencyCount
    };
}


// --- Operations ---

export async function createLogisticsTask(data: any) {
    const orgId = await getOrgId();
    try {
        const task = await prisma.logisticsTask.create({
            data: {
                title: data.title,
                description: data.description,
                address: data.address,
                moneyToCollect: data.moneyToCollect,
                urgency: data.urgency,
                status: "PENDING",
                organizationId: orgId
            }
        });
        revalidatePath("/logistics");
        return { success: true, task };
    } catch (e) {
        return { success: false, error: "Failed to create task" };
    }
}

export async function assignDelivery(id: string, driverId: string, type: "SALE" | "TASK") {
    const orgId = await getOrgId();
    try {
        if (type === "SALE") {
            const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
            if (!sale) throw new Error("Sale not found");

            await prisma.sale.update({
                where: { id },
                data: {
                    assignedToId: driverId,
                    deliveryStatus: "ON_ROUTE",
                    onRouteAt: new Date()
                }
            });
        } else {
            const task = await prisma.logisticsTask.findFirst({ where: { id, organizationId: orgId } });
            if (!task) throw new Error("Task not found");

            await prisma.logisticsTask.update({
                where: { id },
                data: {
                    assignedToId: driverId,
                    status: "ON_ROUTE"
                }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to assign" };
    }
}

export async function unassignDelivery(id: string, type: "SALE" | "TASK") {
    const orgId = await getOrgId();
    try {
        if (type === "SALE") {
            const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
            if (!sale) throw new Error("Sale not found");

            await prisma.sale.update({
                where: { id },
                data: {
                    assignedToId: null,
                    deliveryStatus: "PENDING",
                    deliveryMethod: "DELIVERY",
                    onRouteAt: null
                }
            });
        } else {
            const task = await prisma.logisticsTask.findFirst({ where: { id, organizationId: orgId } });
            if (!task) throw new Error("Task not found");

            await prisma.logisticsTask.update({
                where: { id },
                data: {
                    assignedToId: null,
                    status: "PENDING",
                    onRouteAt: null
                }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to unassign" };
    }
}

export async function switchToPickup(id: string) {
    const orgId = await getOrgId();
    try {
        const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
        if (!sale) throw new Error("Sale not found");

        await prisma.sale.update({
            where: { id },
            data: {
                deliveryMethod: "PICKUP",
                deliveryStatus: "PENDING",
                assignedToId: null,
                onRouteAt: null
            }
        });
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to switch" };
    }
}

export async function markAsDelivered(id: string, type: "SALE" | "TASK", evidenceUrl: string) {
    const orgId = await getOrgId();
    try {
        if (type === "SALE") {
            const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
            if (!sale) throw new Error("Sale not found");

            await prisma.sale.update({
                where: { id },
                data: {
                    deliveryStatus: "DELIVERED",
                    evidenceUrl: evidenceUrl,
                    completedAt: new Date()
                }
            });
        } else {
            const task = await prisma.logisticsTask.findFirst({ where: { id, organizationId: orgId } });
            if (!task) throw new Error("Task not found");

            await prisma.logisticsTask.update({
                where: { id },
                data: {
                    status: "COMPLETED",
                    evidenceUrl: evidenceUrl,
                    completedAt: new Date()
                }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to finalize" };
    }
}

export async function reportDeliveryIssue(id: string, type: "SALE" | "TASK", comment: string, action: "CANCEL" | "COMMENT") {
    const orgId = await getOrgId();
    try {
        const prefix = `[${new Date().toLocaleTimeString()}] ${action === 'CANCEL' ? 'CANCELADO: ' : 'NOV: '} ${comment}\n`;

        if (type === "SALE") {
            const current = await prisma.sale.findFirst({ where: { id, organizationId: orgId }, select: { notes: true } });
            if (!current) throw new Error("Sale not found");

            const newNotes = (current?.notes || "") + "\n" + prefix;

            if (action === "CANCEL") {
                await prisma.sale.update({
                    where: { id },
                    data: {
                        deliveryStatus: "PENDING",
                        assignedToId: null,
                        notes: newNotes,
                        onRouteAt: null
                    }
                });
            } else {
                await prisma.sale.update({
                    where: { id },
                    data: { notes: newNotes }
                });
            }
        } else {
            const current = await prisma.logisticsTask.findFirst({ where: { id, organizationId: orgId }, select: { description: true } });
            if (!current) throw new Error("Task not found");

            const newDesc = (current?.description || "") + "\n" + prefix;

            if (action === "CANCEL") {
                await prisma.logisticsTask.update({
                    where: { id },
                    data: {
                        status: "PENDING",
                        assignedToId: null,
                        description: newDesc,
                        onRouteAt: null
                    }
                });
            } else {
                await prisma.logisticsTask.update({
                    where: { id },
                    data: { description: newDesc }
                });
            }
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to report" };
    }
}
