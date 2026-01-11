"use server";

import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfYear, eachDayOfInterval } from "date-fns";
import { getDashboardMetrics as getCollectionMetrics } from "../sales/collections/actions";
import { es } from "date-fns/locale";
import { auth } from "@/auth";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function getSalesTrend(range: '7d' | '15d' | '30d' | 'month' = '7d') {
    const orgId = await getOrgId();
    const today = new Date();
    let startDate = subDays(today, 6); // Default 7d

    if (range === '15d') startDate = subDays(today, 14);
    if (range === '30d') startDate = subDays(today, 29);
    if (range === 'month') startDate = startOfMonth(today);

    // Fetch raw sales
    const salesRaw = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            date: { gte: startOfDay(startDate) }
        },
        select: { date: true, total: true }
    });

    // Generate all days in interval to ensure no gaps
    const daysInterval = eachDayOfInterval({ start: startDate, end: today });

    const chartData = daysInterval.map(d => {
        const dayStr = format(d, "yyyy-MM-dd");
        const dayLabel = format(d, "EEE", { locale: es }); // Mon, Tue (in Spanish)
        const fullDate = format(d, "dd/MM");

        const dayTotal = salesRaw
            .filter(s => format(s.date, "yyyy-MM-dd") === dayStr)
            .reduce((acc, curr) => acc + curr.total.toNumber(), 0);

        return {
            name: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), // Capitalize
            fullDate,
            total: dayTotal
        };
    });

    return chartData;
}

export async function getDashboardData() {
    const orgId = await getOrgId();
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfMonthDate = startOfMonth(today);
    const startOfYearDate = startOfYear(today);

    // 1. Parallel Fetching
    const [
        dailySalesAgg,
        monthlySalesAgg,
        yearlySalesAgg,
        inventoryValueAgg,
        balanceAccounts,
        salesOnRouteCount,
        tasksOnRouteCount,
        allProducts,
        collectionMetrics
    ] = await Promise.all([
        // Sales Today
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfToday, lte: endOfToday }, organizationId: orgId } }),
        // Sales Month
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfMonthDate }, organizationId: orgId } }),
        // Sales Year
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfYearDate }, organizationId: orgId } }),

        // Inventory Value - Filter by Product Org
        prisma.instance.aggregate({
            _sum: { cost: true },
            where: {
                status: "IN_STOCK",
                product: { organizationId: orgId }
            }
        }),

        // Balances by Account Type (Grouped)
        prisma.paymentAccount.findMany({
            where: { organizationId: orgId },
            select: { type: true, balance: true }
        }),

        // Logistics Counts
        prisma.sale.count({ where: { deliveryStatus: "ON_ROUTE", organizationId: orgId } }),
        prisma.logisticsTask.count({ where: { status: "ON_ROUTE", organizationId: orgId } }),

        // Products for Low Stock (Optimized: select only needed fields)
        prisma.product.findMany({
            where: { organizationId: orgId },
            include: { instances: { where: { status: "IN_STOCK" } } }
        }),

        // Collections (Metric function handles Org ID internally? No, we need to pass it or it calls getOrgId inside)
        // Check `getCollectionMetrics`. It's imported from `../sales/collections/actions`. 
        // I will update that file next, so it will use `getOrgId()`.
        getCollectionMetrics()
    ]);

    // 2. Process Data
    const dailySales = dailySalesAgg._sum.total?.toNumber() || 0;
    const monthlySales = monthlySalesAgg._sum.total?.toNumber() || 0;
    const yearlySales = yearlySalesAgg._sum.total?.toNumber() || 0;

    const inventoryValue = inventoryValueAgg._sum.cost?.toNumber() || 0;

    // Process Balances
    let balanceBank = 0;
    let balanceCash = 0;
    balanceAccounts.forEach(acc => {
        const val = acc.balance.toNumber();
        if (acc.type === 'CASH') balanceCash += val;
        else balanceBank += val; // BANK, WALLET, etc.
    });
    const totalLiquidity = balanceBank + balanceCash;

    const pendingDeliveries = salesOnRouteCount + tasksOnRouteCount;

    // 3. Low Stock Alerts (< 2 units)
    const lowStockItems = allProducts
        .filter(p => p.instances.length < 2)
        .map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            stock: p.instances.length
        }))
        .slice(0, 5);

    // 4. Initial Chart Data (7 Days default)
    const weeklySalesData = await getSalesTrend('7d');

    // 5. Top Categories (Last 30 Days)
    const last30Days = subDays(today, 30);
    const soldInstances = await prisma.instance.findMany({
        where: {
            status: "SOLD",
            sale: { date: { gte: last30Days }, organizationId: orgId },
            product: { organizationId: orgId }
        },
        include: { product: true }
    });

    const categoryCount: Record<string, number> = {};
    soldInstances.forEach(i => {
        const cat = i.product.category || "General";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 6. Recent Active Logistics
    const recentDeliveries = await prisma.sale.findMany({
        where: {
            deliveryStatus: { in: ["PENDING", "ON_ROUTE"] },
            organizationId: orgId
        },
        include: { customer: true },
        orderBy: { urgency: "desc" },
        take: 5
    });

    const agingTotal = (collectionMetrics.aging["16-30"] || 0) + (collectionMetrics.aging["31-60"] || 0) + (collectionMetrics.aging["+90"] || 0);

    return {
        salesMetrics: {
            today: dailySales,
            month: monthlySales,
            year: yearlySales
        },
        financials: {
            inventoryValue,
            balanceBank,
            balanceCash,
            totalLiquidity
        },
        logistics: {
            pending: pendingDeliveries,
            recent: recentDeliveries.map(d => ({
                id: d.id,
                customer: d.customer.name,
                status: d.deliveryStatus,
                urgency: d.urgency,
                address: d.customer.address
            }))
        },
        lowStockItems,
        initialChartData: weeklySalesData,
        topCategories,
        agingTotal
    };
}
