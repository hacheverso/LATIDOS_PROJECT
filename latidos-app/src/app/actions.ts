"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { auth } from "@/auth";

async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function getExecutiveMetrics() {
    const orgId = await getOrgId(); // Helper we already have
    const now = new Date();
    const firstDayOfMonth = startOfMonth(now);
    const last7Days = subDays(now, 7);

    // 1. Sales of the Month
    const salesThisMonth = await prisma.sale.findMany({
        where: {
            date: { gte: firstDayOfMonth },
            organizationId: orgId
        },
        select: { total: true }
    });
    const totalSalesMonth = salesThisMonth.reduce((acc, sale) => acc + Number(sale.total), 0);

    // 2. Inventory Value (Total Cost in Warehouse)
    // Need to filter products by orgId first, or use Instance link if available.
    // Schema: Instance -> Product -> Organization
    const inventoryAgg = await prisma.instance.aggregate({
        _sum: { cost: true },
        where: {
            status: "IN_STOCK",
            product: { organizationId: orgId }
        }
    });
    const totalInventoryValue = Number(inventoryAgg._sum.cost || 0);

    // 3. Total Debt (Cartera)
    const allSales = await prisma.sale.findMany({
        where: { organizationId: orgId },
        select: { id: true, total: true, amountPaid: true, date: true, customer: { select: { name: true } } }
    });

    let totalDebt = 0;
    const debtBuckets = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    const criticalDebtors: any[] = [];

    for (const sale of allSales) {
        const balance = Number(sale.total) - Number(sale.amountPaid);
        if (balance > 100) {
            totalDebt += balance;

            const daysOld = differenceInDays(now, sale.date);
            if (daysOld <= 30) debtBuckets["0-30"] += balance;
            else if (daysOld <= 60) debtBuckets["31-60"] += balance;
            else if (daysOld <= 90) debtBuckets["61-90"] += balance;
            else {
                debtBuckets[">90"] += balance;
                criticalDebtors.push({
                    client: sale.customer.name,
                    days: daysOld,
                    amount: balance
                });
            }
        }
    }

    // 4. Weekly Sales Trend
    const salesLast7Days = await prisma.sale.findMany({
        where: {
            date: { gte: last7Days },
            organizationId: orgId
        },
        select: { date: true, total: true }
    });

    const weeklySales = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i);
        const dayStart = startOfDay(d);
        const dayEnd = endOfDay(d);

        const dayTotal = salesLast7Days
            .filter(s => s.date >= dayStart && s.date <= dayEnd)
            .reduce((acc, s) => acc + Number(s.total), 0);

        return {
            date: d.toLocaleDateString('es-CO', { weekday: 'short' }),
            fullDate: d.toISOString(),
            amount: dayTotal
        };
    });

    // 5. Critical Alerts: Out of Stock
    const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        include: {
            instances: {
                where: { status: "IN_STOCK" },
                select: { id: true }
            }
        }
    });
    const outOfStockProducts = products.filter(p => p.instances.length === 0).map(p => p.name);

    return {
        salesMonth: totalSalesMonth,
        inventoryValue: totalInventoryValue,
        totalDebt,
        moneyOnStreetPct: (totalDebt + totalInventoryValue) > 0 ? (totalDebt / (totalDebt + totalInventoryValue)) * 100 : 0,
        weeklySales,
        debtBuckets,
        criticalAlerts: {
            stock: outOfStockProducts.slice(0, 5),
            debt: criticalDebtors.sort((a, b) => b.amount - a.amount).slice(0, 5)
        },
        topClient: await getTopClient()
    };
}

async function getTopClient() {
    const orgId = await getOrgId();
    const start = subDays(new Date(), 30);
    const sales = await prisma.sale.findMany({
        where: {
            date: { gte: start },
            organizationId: orgId
        },
        include: { customer: true }
    });

    const clientMap = new Map();
    sales.forEach(s => {
        const current = clientMap.get(s.customerId) || { name: s.customer.name, total: 0 };
        current.total += Number(s.total);
        clientMap.set(s.customerId, current);
    });

    const sorted = Array.from(clientMap.values()).sort((a, b) => b.total - a.total);
    return sorted.length > 0 ? sorted[0] : null;
}

import { hash } from "bcryptjs";

export async function registerBusiness(formData: FormData) {
    const orgName = formData.get("orgName") as string;
    const userName = formData.get("userName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!orgName || !userName || !email || !password) {
        return { error: "Todos los campos son obligatorios." };
    }

    // 1. Validate uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return { error: "El correo electrónico ya está registrado." };
    }

    try {
        const hashedPassword = await hash(password, 10);

        await prisma.$transaction(async (tx) => {
            // 2. Create Organization
            const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: slug
                }
            });

            // 3. Create Organization Profile
            await tx.organizationProfile.create({
                data: {
                    organizationId: org.id,
                    name: orgName,
                    // description: "Organización Principal", // REMOVED
                    // isActive: true, // REMOVED
                    defaultDueDays: 30
                }
            });

            // 4. Create Admin User
            await tx.user.create({
                data: {
                    name: userName,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    organizationId: org.id
                }
            });

            // 5. Create Default Payment Account (CRITICAL)
            await tx.paymentAccount.create({
                data: {
                    name: "Efectivo (Caja General)",
                    type: "CASH",
                    currency: "COP",
                    balance: 0,
                    organizationId: org.id,
                    isDefault: true
                }
            });

            // 6. Create Default Logistic Zone
            await tx.logisticZone.create({
                data: {
                    name: "Zona Local (Default)",
                    organizationId: org.id
                }
            });
        });

        return { success: true };

    } catch (error: any) {
        console.error("Registration Error:", error);
        return { error: "Error al crear la cuenta: " + error.message };
    }
}
