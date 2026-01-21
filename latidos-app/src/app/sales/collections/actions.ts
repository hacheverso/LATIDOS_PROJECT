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

export async function searchCustomers(query: string) {
    const orgId = await getOrgId();
    if (!query) return [];

    const customers = await prisma.customer.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { taxId: { contains: query } },
                { phone: { contains: query } }
            ]
        },
        take: 10,
        orderBy: { name: 'asc' }
    });

    return customers;
}

export async function getPendingInvoices(customerId: string) {
    const orgId = await getOrgId();
    const sales = await prisma.sale.findMany({
        where: {
            customerId: customerId,
            organizationId: orgId,
            OR: [
                { amountPaid: { lt: prisma.sale.fields.total } }
            ]
        },
        include: {
            payments: {
                orderBy: { date: 'desc' },
                take: 1
            }
        },
        orderBy: { date: 'asc' } // Oldest first
    });

    // Filter logic for exact comparison using Decimal
    return sales.filter(sale => sale.amountPaid.lt(sale.total)).map(sale => ({
        ...sale,
        total: sale.total.toNumber(),
        amountPaid: sale.amountPaid.toNumber(),
        pendingBalance: sale.total.sub(sale.amountPaid).toNumber(),
        payments: sale.payments.map(p => ({
            ...p,
            amount: p.amount.toNumber()
        }))
    }));
}

export async function getCustomerById(id: string) {
    const orgId = await getOrgId();
    if (!id) return null;
    return await prisma.customer.findFirst({
        where: { id, organizationId: orgId }
    });
}

export async function getDashboardMetrics() {
    const orgId = await getOrgId();

    // Fetch Organization Profile for specific settings
    const profile = await prisma.organizationProfile.findUnique({
        where: { organizationId: orgId }
    });

    const paymentTermDays = profile?.defaultDueDays || 30; // Default to 30 if not set

    // Fetch relevant sales
    const allSales = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { amountPaid: { lt: prisma.sale.fields.total } }
            ]
        },
        include: {
            customer: true
        }
    });

    const customersWithCredit = await prisma.customer.findMany({
        // @ts-ignore
        where: { creditBalance: { gt: 0 }, organizationId: orgId },
        // @ts-ignore
        select: { id: true, name: true, creditBalance: true }
    });

    const now = new Date();
    // Reset time for accurate day comparison
    now.setHours(0, 0, 0, 0);

    const metrics = {
        paymentTermDays, // Pass to frontend
        totalReceivable: 0,
        overdueDebt: 0,
        // @ts-ignore
        creditBalances: customersWithCredit.reduce((acc, curr) => acc + curr.creditBalance.toNumber(), 0),
        customersWithCreditCount: customersWithCredit.length,
        // We will keep same keys for aging to avoid breaking UI strictly, 
        // but value population will shift. 
        // Or better: Update UI to respect dynamic ranges.
        // For now, let's Stick to fixed buckets for UI charts, but use the term for "Overdue" status.
        agingBuckets: { // New explicit buckets
            current: 0,
            overdue: 0,
            critical: 0
        },
        // Legacy keys to not break UI immediately
        aging: {
            "1-15": 0,
            "16-30": 0,
            "31-60": 0,
            "+90": 0
        },
        projection: [
            { name: "Vencido", amount: 0, fill: "#ef4444" },     // Overdue (Red)
            { name: "Esta Sem.", amount: 0, fill: "#f59e0b" },    // Due in 0-7 days (Orange/Yellow)
            { name: "Próx. Sem.", amount: 0, fill: "#10b981" },   // Due in 8-14 days (Green)
            { name: "Futuro", amount: 0, fill: "#3b82f6" }        // Due later (Blue)
        ],
        topDebtors: [] as any[],
        activeDebtors: [] as any[]
    };

    const debtorsMap = new Map<string, {
        id: string;
        name: string;
        phone: string | null;
        totalDebt: number;
        oldestInvoiceDate: Date;
        invoicesCount: number;
        invoices: any[];
    }>();

    allSales.forEach(sale => {
        const total = sale.total.toNumber();
        const paid = sale.amountPaid.toNumber();
        const balance = total - paid;
        const saleDate = new Date(sale.date);

        // Calculated Due Date (Dynamic based on Settings)
        const dueDate = new Date(saleDate);
        dueDate.setDate(saleDate.getDate() + paymentTermDays);

        // Time Diff for Aging (Past)
        const daysOld = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24));

        // Time Diff for Due Date (Future)
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (balance > 0) {
            metrics.totalReceivable += balance;

            // 1. Aging Calculation (Based on Invoice Creation Date)
            // We keep the fixed buckets for the UI chart consistency (Visual 15/30/60 format)
            if (daysOld <= 15) metrics.aging["1-15"] += balance;
            else if (daysOld <= 30) metrics.aging["16-30"] += balance;
            else if (daysOld <= 60) metrics.aging["31-60"] += balance;
            else metrics.aging["+90"] += balance;

            // Overdue Logic (Dynamic Config)
            if (daysOld > paymentTermDays) {
                metrics.overdueDebt += balance;
            }

            // 2. Projection Calculation (Based on Due Date)
            if (daysUntilDue < 0) {
                // Already Due (Overdue)
                metrics.projection[0].amount += balance;
            } else if (daysUntilDue <= 7) {
                // Due this week
                metrics.projection[1].amount += balance;
            } else if (daysUntilDue <= 14) {
                // Due next week
                metrics.projection[2].amount += balance;
            } else {
                // Future
                metrics.projection[3].amount += balance;
            }

            // Group by Customer
            if (!debtorsMap.has(sale.customerId)) {
                debtorsMap.set(sale.customerId, {
                    id: sale.customerId,
                    name: sale.customer.name,
                    phone: sale.customer.phone,
                    totalDebt: 0,
                    oldestInvoiceDate: sale.date,
                    invoicesCount: 0,
                    invoices: [] as any[]
                });
            }

            const debtor = debtorsMap.get(sale.customerId)!;
            debtor.totalDebt += balance;
            debtor.invoicesCount++;

            // Add invoice detail for WhatsApp logic
            debtor.invoices.push({
                invoiceNumber: sale.invoiceNumber,
                balance: balance,
                daysOld: daysOld,
                dueDate: dueDate,   // Pass calculated due date
                daysUntilDue: daysUntilDue
            });

            if (sale.date < debtor.oldestInvoiceDate) {
                debtor.oldestInvoiceDate = sale.date;
            }
        }
    });

    // Format Lists
    const debtorsList = Array.from(debtorsMap.values()).map(d => ({
        ...d,
        oldestInvoiceDays: Math.floor((now.getTime() - d.oldestInvoiceDate.getTime()) / (1000 * 3600 * 24))
    }));

    metrics.topDebtors = [...debtorsList].sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);
    metrics.activeDebtors = debtorsList.sort((a, b) => b.totalDebt - a.totalDebt); // Default sort by debt

    return metrics;
}
