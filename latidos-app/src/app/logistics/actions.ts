"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    try {
        const zones = await prisma.logisticZone.findMany({
            orderBy: { name: 'asc' }
        });
        return zones;
    } catch (error) {
        console.error("Error fetching zones:", error);
        return [];
    }
}

export async function createLogisticZone(name: string) {
    try {
        const zone = await prisma.logisticZone.create({
            data: { name: name.trim() }
        });
        revalidatePath("/logistics");
        return { success: true, zone };
    } catch (error) {
        return { success: false, error: "Failed to create zone" };
    }
}

// Seed function to ensure we have basics
export async function seedLogisticZones() {
    const defaults = ["Monterrey", "Poblado", "Centro", "Laureles", "Bello", "Envigado", "Sabaneta"];
    for (const name of defaults) {
        const exists = await prisma.logisticZone.findUnique({ where: { name } });
        if (!exists) {
            await prisma.logisticZone.create({ data: { name } });
        }
    }
}

// --- Board Actions ---

export async function getLogisticsBoard() {
    // 1. Fetch Drivers (Only DOMICILIARIO, per new directive)
    const drivers = await prisma.user.findMany({
        where: {
            role: "DOMICILIARIO"
        },
        select: { id: true, name: true }
    });

    // 2. Fetch Active Deliveries (Pending or On Route)
    const activeSales = await prisma.sale.findMany({
        where: {
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
        where: { status: { in: ["PENDING", "ON_ROUTE"] } },
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
    const pending = allItems.filter(i => i.status === "PENDING" && i.sale?.deliveryMethod !== "PICKUP");
    const pickup = allItems.filter(i => i.sale?.deliveryMethod === "PICKUP" && i.status !== "DELIVERED"); // Pickups waiting

    // 5. Completed Bucket (TODAY Only)
    // Logic: Colombia is UTC-5. Start of day in Colombia (00:00) is 05:00 UTC.
    const todayStart = new Date();
    todayStart.setUTCHours(5, 0, 0, 0);
    if (new Date() < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
    }

    // Check if we need to fetch explicitly or just filter from allItems?
    // allItems currently only comes from `activeSales` and `activeTasks` which filter for PENDING/ON_ROUTE.
    // So we need to fetch completed items separately or expand the initial query.
    // Better to fetch separately to avoid polluting the 'active' logic.

    const completedSales = await prisma.sale.findMany({
        where: {
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
        where: { status: "COMPLETED", completedAt: { gte: todayStart } },
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
    // Logic: Colombia is UTC-5. Start of day in Colombia (00:00) is 05:00 UTC.
    const startOfDay = new Date();
    startOfDay.setUTCHours(5, 0, 0, 0);
    // If current time is before 5AM UTC (meaning it's technically "tomorrow" in UTC but still "tonight" pre-midnight in prev day... wait. 
    // No. If it's 01:00 UTC, it is 20:00 Colombia (previous day). 
    // So if Now < 5AM UTC, we should subtract 24h to get "Yesterday's" start of day? No, if it's 8PM Colombia, we want Today's start (00:00 Colombia).
    // Let's rely on simple offset calculation to be sure.
    const now = new Date();
    const colombiaOffsetMs = -5 * 60 * 60 * 1000;
    const nowColombia = new Date(now.getTime() + colombiaOffsetMs); // This is just a shifted timestamp, effectively "wrong" timezone but correct "hours".

    // Actually, safest is:
    // 1. Get current date in Bogota
    const bogotaDateStr = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" });
    const bogotaDate = new Date(bogotaDateStr);
    bogotaDate.setHours(0, 0, 0, 0); // Midnight in Bogota

    // 2. Query DB (DB is UTC? Prisma usually handles conversion if DateTime is passed).
    // If I pass 'bogotaDate' (which has local hours 00:00), Prisma might assume it's UTC 00:00 or Local Server 00:00.
    // Let's stick to the 5AM UTC approximation as it's cleaner for server-side logic regardless of server locale.
    const todayStart = new Date();
    // Reset to current day
    todayStart.setUTCHours(5, 0, 0, 0);
    // Adjust: If we receive the request at 02:00 UTC, it is 21:00 Colombia previous day. 
    // todayStart would be 05:00 UTC TODAY, which is future.
    // So if now < todayStart, subtract 1 day.
    if (new Date() < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
    }

    const createdSales = await prisma.sale.count({ where: { date: { gte: todayStart } } });
    const createdTasks = await prisma.logisticsTask.count({ where: { createdAt: { gte: todayStart } } });

    // Completed Today
    const completedSales = await prisma.sale.count({ where: { deliveryStatus: "DELIVERED", updatedAt: { gte: todayStart } } });
    const completedTasks = await prisma.logisticsTask.count({ where: { status: "COMPLETED", updatedAt: { gte: todayStart } } });

    // Active Pending (PENDING + ON_ROUTE)
    // "Solo se descuente cuando pase a COMPLETADA" -> So PENDING and ON_ROUTE count as "Pending".
    const activeSales = await prisma.sale.count({ where: { deliveryStatus: { in: ["PENDING", "ON_ROUTE"] } } });
    const activeTasksCount = await prisma.logisticsTask.count({ where: { status: { in: ["PENDING", "ON_ROUTE"] } } });

    return {
        createdToday: createdSales + createdTasks,
        completedToday: completedSales + completedTasks,
        activePending: activeSales + activeTasksCount,
        averageTime: 45 // Placeholder
    };
}

// --- History & KPIs ---

export async function getLogisticsHistory() {
    const sales = await prisma.sale.findMany({
        where: { deliveryStatus: "DELIVERED" },
        include: {
            customer: true,
            assignedTo: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 50 // Limit for now
    });

    const tasks = await prisma.logisticsTask.findMany({
        where: { status: "COMPLETED" },
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
            completedAt: s.updatedAt, // Should be s.completedAt ideally, falling back to updatedAt
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const countDeliveries = async (start: Date, end?: Date) => {
        const whereSale: any = { deliveryStatus: "DELIVERED", updatedAt: { gte: start } };
        const whereTask: any = { status: "COMPLETED", updatedAt: { gte: start } };

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

    // Driver Ranking (This Month)
    const topSales = await prisma.sale.groupBy({
        by: ['assignedToId'],
        where: { deliveryStatus: "DELIVERED", updatedAt: { gte: startOfMonth } },
        _count: { id: true },
    });

    // Manual merge for drivers since groupBy is limited
    // Simplifying: Fetch all delivered sales includes assignedTo
    const rankingMap = new Map<string, number>();

    const salesThisMonth = await prisma.sale.findMany({
        where: { deliveryStatus: "DELIVERED", updatedAt: { gte: startOfMonth } },
        include: { assignedTo: true }
    });
    const tasksThisMonth = await prisma.logisticsTask.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: startOfMonth } },
        include: { assignedTo: true }
    });

    [...salesThisMonth, ...tasksThisMonth].forEach(item => {
        const name = item.assignedTo?.name || "Desconocido";
        rankingMap.set(name, (rankingMap.get(name) || 0) + 1);
    });

    const driverRanking = Array.from(rankingMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Calc Avg Time (Minutes)
    // Naive: updatedAt - onRouteAt
    let totalMinutes = 0;
    let countWithTime = 0;

    [...salesThisMonth, ...tasksThisMonth].forEach(item => {
        if (item.onRouteAt && item.updatedAt) { // using updatedAt as completedAt proxy
            const diff = (new Date(item.updatedAt).getTime() - new Date(item.onRouteAt).getTime()) / 60000;
            if (diff > 0 && diff < 1000) { // filter outliers
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
    try {
        const task = await prisma.logisticsTask.create({
            data: {
                title: data.title,
                description: data.description,
                address: data.address,
                moneyToCollect: data.moneyToCollect,
                urgency: data.urgency,
                status: "PENDING"
            }
        });
        revalidatePath("/logistics");
        return { success: true, task };
    } catch (e) {
        return { success: false, error: "Failed to create task" };
    }
}

export async function assignDelivery(id: string, driverId: string, type: "SALE" | "TASK") {
    try {
        if (type === "SALE") {
            await prisma.sale.update({
                where: { id },
                data: {
                    assignedToId: driverId,
                    deliveryStatus: "ON_ROUTE",
                    onRouteAt: new Date()
                }
            });
        } else {
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
    try {
        if (type === "SALE") {
            await prisma.sale.update({
                where: { id },
                data: {
                    assignedToId: null,
                    deliveryStatus: "PENDING",
                    deliveryMethod: "DELIVERY", // Reset if it was Pickup? maybe not
                    onRouteAt: null
                }
            });
        } else {
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
    try {
        await prisma.sale.update({
            where: { id },
            data: {
                deliveryMethod: "PICKUP",
                deliveryStatus: "PENDING", // Back to pending until picked up
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
    try {
        if (type === "SALE") {
            await prisma.sale.update({
                where: { id },
                data: {
                    deliveryStatus: "DELIVERED",
                    evidenceUrl: evidenceUrl,
                    completedAt: new Date()
                    // Note: Payments are handled by Finance channels now.
                }
            });
        } else {
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
    try {
        const prefix = `[${new Date().toLocaleTimeString()}] ${action === 'CANCEL' ? 'CANCELADO: ' : 'NOV: '} ${comment}\n`;

        if (type === "SALE") {
            const current = await prisma.sale.findUnique({ where: { id }, select: { notes: true } });
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
            const current = await prisma.logisticsTask.findUnique({ where: { id }, select: { description: true } });
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
