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

// --- Helper: Date Range ---
function getDateFilter(range: string = "TODAY", from?: string, to?: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Local start

    // Adjust for timezone if needed, but simplistic approach first
    if (range === "TODAY") {
        return { gte: todayStart };
    }
    if (range === "7D") {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return { gte: sevenDaysAgo };
    }
    if (range === "30D") {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return { gte: thirtyDaysAgo };
    }
    if (range === "YEAR") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { gte: startOfYear };
    }
    if (range === "CUSTOM" && from && to) {
        return {
            gte: new Date(from),
            lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    }
    return { gte: todayStart }; // Default
}

export async function getLogisticsHistory(filters: { range: string, from?: string, to?: string } = { range: "TODAY" }) {
    const orgId = await getOrgId();
    const dateFilter = getDateFilter(filters.range, filters.from, filters.to);

    const sales = await prisma.sale.findMany({
        where: {
            deliveryStatus: "DELIVERED",
            organizationId: orgId,
            updatedAt: dateFilter
        },
        include: {
            customer: true,
            assignedTo: true,
            operator: true // Include operator relation
        },
        orderBy: { updatedAt: 'desc' },
        take: 200 // Safety limit
    });

    const tasks = await prisma.logisticsTask.findMany({
        where: {
            status: "COMPLETED",
            organizationId: orgId,
            updatedAt: dateFilter
        },
        include: {
            assignedTo: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 200
    });

    // Merge and sort
    const history = [
        ...sales.map(s => {
            // Logic: If Pickup -> Operator Name. If Delivery -> Driver Name.
            const isPickup = s.deliveryMethod === "PICKUP";
            // @ts-ignore
            const responsible = isPickup ? (s.operatorName || s.operator?.name || "Oficina") : (s.assignedTo?.name || "Sin Asignar");

            return {
                id: s.id,
                type: "SALE" as const,
                title: `Factura ${s.invoiceNumber || s.id.slice(0, 8)}`,
                status: "DELIVERED",
                method: (isPickup ? "PICKUP" : "DELIVERY") as "PICKUP" | "DELIVERY",
                responsible: responsible,
                urgency: s.urgency,
                createdAt: s.date,
                onRouteAt: s.onRouteAt,
                completedAt: s.updatedAt,
                evidenceUrl: s.evidenceUrl,
                notes: s.notes
            };
        }),
        ...tasks.map(t => {
            // Tasks usually don't have "pickup" method, but we check if we want to trace operator
            // @ts-ignore
            const responsible = t.assignedTo?.name || t.operatorName || "Sin Asignar";

            return {
                id: t.id,
                type: "TASK" as const,
                title: t.title,
                status: "COMPLETED",
                method: "DELIVERY" as "PICKUP" | "DELIVERY", // Default tasks as delivery
                responsible: responsible,
                urgency: t.urgency,
                createdAt: t.createdAt,
                onRouteAt: t.onRouteAt,
                completedAt: t.updatedAt,
                evidenceUrl: t.evidenceUrl,
                notes: t.description
            };
        })
    ].sort((a, b) => {
        const ca = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const cb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return cb - ca;
    });

    return history;
}

export async function getLogisticsKPIs(filters: { range: string, from?: string, to?: string } = { range: "TODAY" }) {
    const orgId = await getOrgId();
    const dateFilter = getDateFilter(filters.range, filters.from, filters.to);

    // Fetch All Data for Metrics (Active Range)
    const sales = await prisma.sale.findMany({
        where: { deliveryStatus: "DELIVERED", organizationId: orgId, updatedAt: dateFilter },
        include: { assignedTo: true }
    });
    const tasks = await prisma.logisticsTask.findMany({
        where: { status: "COMPLETED", organizationId: orgId, updatedAt: dateFilter },
        include: { assignedTo: true }
    });

    const allItems = [...sales, ...tasks];

    // 1. Counters
    const totalDeliveries = allItems.filter(i => {
        // Sales that are NOT pickup + All Tasks
        const isSale = 'deliveryMethod' in i;
        if (isSale) return (i as any).deliveryMethod !== "PICKUP";
        return true;
    }).length;

    const totalPickups = allItems.filter(i => {
        const isSale = 'deliveryMethod' in i;
        if (isSale) return (i as any).deliveryMethod === "PICKUP";
        return false;
    }).length;

    // 2. Driver Ranking (For Deliveries)
    const driverMap = new Map<string, number>();
    allItems.forEach(i => {
        const isPickup = 'deliveryMethod' in i && (i as any).deliveryMethod === "PICKUP";
        if (!isPickup && i.assignedTo?.name) {
            driverMap.set(i.assignedTo.name, (driverMap.get(i.assignedTo.name) || 0) + 1);
        }
    });

    // 3. Operator Ranking (For Pickups)
    const operatorMap = new Map<string, number>();
    sales.forEach(s => {
        if (s.deliveryMethod === "PICKUP") {
            // @ts-ignore
            const name = s.operatorName || "Desconocido";
            operatorMap.set(name, (operatorMap.get(name) || 0) + 1);
        }
    });

    // 4. Time Calc
    let totalMinutes = 0;
    let countWithTime = 0;
    allItems.forEach(item => {
        if (item.onRouteAt && item.updatedAt) {
            const diff = (new Date(item.updatedAt).getTime() - new Date(item.onRouteAt).getTime()) / 60000;
            if (diff > 0 && diff < 1440) { // < 24h
                totalMinutes += diff;
                countWithTime++;
            }
        }
    });
    const avgTime = countWithTime > 0 ? Math.round(totalMinutes / countWithTime) : 0;

    return {
        totalDeliveries,
        totalPickups,
        avgTime,
        driverRanking: Array.from(driverMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 3),
        topOperators: Array.from(operatorMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 3),
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

import { verifyPin } from "../sales/actions";

export async function markAsDelivered(id: string, type: "SALE" | "TASK", evidenceUrl: string, operatorPin: string, deliveryNote?: string) {
    const orgId = await getOrgId();
    try {
        // 1. Verify Signature
        const signer = await verifyPin(operatorPin);
        if (!signer) return { success: false, error: "PIN inválido o usuario no autorizado." };

        const isOperator = signer.role === "OPERATOR";
        const opId = isOperator ? signer.id : undefined;
        const userId = !isOperator ? signer.id : undefined;

        // Note Formatting
        const noteText = deliveryNote ? `\n[ENTREGA]: ${deliveryNote}` : "";

        if (type === "SALE") {
            const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
            if (!sale) throw new Error("Sale not found");

            await prisma.$transaction(async (tx) => {
                // Update Sale
                // Append note if exists
                await tx.sale.update({
                    where: { id },
                    data: {
                        deliveryStatus: "DELIVERED",
                        evidenceUrl: evidenceUrl,
                        completedAt: new Date(),
                        // @ts-ignore
                        operatorName: signer.name,
                        operatorId: opId,
                        notes: sale.notes ? sale.notes + noteText : noteText.trim()
                    }
                });

                // Create Audit
                await tx.saleAudit.create({
                    data: {
                        saleId: id,
                        reason: "Entrega Finalizada",
                        changes: { event: "DELIVERY_COMPLETED", evidence: evidenceUrl, note: deliveryNote },
                        userName: signer.name,
                        userId: userId as any,
                        operatorId: opId as any
                    }
                });
            });

        } else {
            const task = await prisma.logisticsTask.findFirst({ where: { id, organizationId: orgId } });
            if (!task) throw new Error("Task not found");

            await prisma.logisticsTask.update({
                where: { id },
                data: {
                    status: "COMPLETED",
                    evidenceUrl: evidenceUrl,
                    completedAt: new Date(),
                    // @ts-ignore
                    operatorName: signer.name,
                    operatorId: opId,
                    description: task.description ? task.description + noteText : noteText.trim()
                }
            });
        }
        revalidatePath("/logistics");
        return { success: true };
    } catch (e) {
        console.error(e);
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
