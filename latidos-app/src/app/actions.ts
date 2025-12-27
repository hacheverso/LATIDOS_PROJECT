"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";

export async function getExecutiveMetrics() {
    const now = new Date();
    const firstDayOfMonth = startOfMonth(now);
    const last7Days = subDays(now, 7);

    // 1. Sales of the Month
    const salesThisMonth = await prisma.sale.findMany({
        where: { date: { gte: firstDayOfMonth } },
        select: { total: true }
    });
    const totalSalesMonth = salesThisMonth.reduce((acc, sale) => acc + Number(sale.total), 0);

    // 2. Inventory Value (Total Cost in Warehouse)
    const inventoryAgg = await prisma.instance.aggregate({
        _sum: { cost: true },
        where: { status: "IN_STOCK" }
    });
    const totalInventoryValue = Number(inventoryAgg._sum.cost || 0);

    // 3. Total Debt (Cartera) & Debt Buckets
    // Fetch all sales that MIGHT have debt (optimization: exclude very old paid ones if possible, but hard without status)
    // We'll fetch id, total, amountPaid, date
    const allSales = await prisma.sale.findMany({
        select: { id: true, total: true, amountPaid: true, date: true, customer: { select: { name: true } } }
    });

    let totalDebt = 0;
    const debtBuckets = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    const criticalDebtors: any[] = [];

    for (const sale of allSales) {
        const balance = Number(sale.total) - Number(sale.amountPaid);
        if (balance > 100) { // Tolerance for floating point
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

    // 4. Weekly Sales Trend (Last 7 Days)
    const salesLast7Days = await prisma.sale.findMany({
        where: { date: { gte: last7Days } },
        select: { date: true, total: true }
    });

    const weeklySales = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i); // 6 days ago to today
        const dayStart = startOfDay(d);
        const dayEnd = endOfDay(d);

        const dayTotal = salesLast7Days
            .filter(s => s.date >= dayStart && s.date <= dayEnd)
            .reduce((acc, s) => acc + Number(s.total), 0);

        return {
            date: d.toLocaleDateString('es-CO', { weekday: 'short' }), // "lun", "mar"
            fullDate: d.toISOString(),
            amount: dayTotal
        };
    });

    // 5. Critical Alerts: Out of Stock
    // Find products with 0 stock instances
    // Complex query: Find products where NO instances are IN_STOCK
    // Easier: Find all products, count in-stock instances
    // Optimization: Use GroupBy on Instances?
    // Let's stick to a robust check on products.
    // Since we need to know exactly WHICH products are out of stock.
    const products = await prisma.product.findMany({
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
        moneyOnStreetPct: (totalDebt / (totalDebt + totalInventoryValue)) * 100,
        weeklySales,
        debtBuckets,
        criticalAlerts: {
            stock: outOfStockProducts.slice(0, 5), // Top 5
            debt: criticalDebtors.sort((a, b) => b.amount - a.amount).slice(0, 5) // Top 5 highest debt
        },
        topClient: await getTopClient()
    };
}

async function getTopClient() {
    // Basic logic: Best client by volume in last 30 days
    // Reusing logic from sales intelligence approx
    const start = subDays(new Date(), 30);
    const sales = await prisma.sale.findMany({
        where: { date: { gte: start } },
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
