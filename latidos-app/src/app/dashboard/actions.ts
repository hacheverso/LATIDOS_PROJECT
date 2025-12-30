"use server";

import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfYear, eachDayOfInterval } from "date-fns";
import { getDashboardMetrics as getCollectionMetrics } from "../sales/collections/actions";
import { es } from "date-fns/locale";

export async function getSalesTrend(range: '7d' | '15d' | '30d' | 'month' = '7d') {
    const today = new Date();
    let startDate = subDays(today, 6); // Default 7d

    if (range === '15d') startDate = subDays(today, 14);
    if (range === '30d') startDate = subDays(today, 29);
    if (range === 'month') startDate = startOfMonth(today);

    // Fetch raw sales
    const salesRaw = await prisma.sale.findMany({
        where: {
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
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfToday, lte: endOfToday } } }),
        // Sales Month
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfMonthDate } } }),
        // Sales Year
        prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: startOfYearDate } } }),

        // Inventory Value
        prisma.instance.aggregate({ _sum: { cost: true }, where: { status: "IN_STOCK" } }),

        // Balances by Account Type (Grouped)
        prisma.paymentAccount.findMany({
            select: { type: true, balance: true }
        }),

        // Logistics Counts
        prisma.sale.count({ where: { deliveryStatus: "ON_ROUTE" } }),
        prisma.logisticsTask.count({ where: { status: "ON_ROUTE" } }),

        // Products for Low Stock (Optimized: select only needed fields)
        prisma.product.findMany({
            include: { instances: { where: { status: "IN_STOCK" } } }
        }),

        // Collections
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
            sale: { date: { gte: last30Days } }
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
        where: { deliveryStatus: { in: ["PENDING", "ON_ROUTE"] } },
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
