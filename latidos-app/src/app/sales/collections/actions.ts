"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function searchCustomers(query: string) {
    if (!query) return [];

    const customers = await prisma.customer.findMany({
        where: {
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
    const sales = await prisma.sale.findMany({
        where: {
            customerId: customerId,
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

// ... existing imports

export async function getCustomerById(id: string) {
    if (!id) return null;
    return await prisma.customer.findUnique({
        where: { id }
    });
}

export async function processCascadePayment(
    customerId: string,
    totalAmount: number,
    invoiceIds: string[],
    method: string = "EFECTIVO",
    accountId: string, // New required parameter
    strategy: "FIFO" | "SELECTED" = "FIFO"
) {
    try {
        const session = await auth();
        console.log("Session:", JSON.stringify(session, null, 2));
        if (!session?.user?.email) return { success: false, error: "Unauthorized: No session or email" };

        let user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) {
            console.log("User missing, creating default admin user for dev...");
            user = await prisma.user.create({
                data: {
                    name: session.user.name || "Admin User",
                    email: session.user.email,
                    role: "ADMIN",
                    password: "", // No password needed for session-based auth in this specific dev context or handle appropriately
                }
            });
        }

        let remainingAmount = totalAmount;
        let appliedPayments: { invoice: string, amount: number, newBalance: number }[] = [];

        // 1. Fetch Invoices and Customer Name
        const invoices = await prisma.sale.findMany({
            where: {
                id: { in: invoiceIds },
                customerId: customerId
            },
            include: { customer: { select: { name: true } } },
            orderBy: { date: 'asc' }
        });

        if (invoices.length === 0) {
            console.log("No invoices found for IDs:", invoiceIds);
            return { success: false, error: "No invoices found" };
        }
        const customerName = invoices[0].customer.name;
        console.log("Processing payment for:", customerName, "Total:", totalAmount);

        await prisma.$transaction(async (tx) => {
            for (const invoice of invoices) {
                if (remainingAmount <= 0) break;

                const pending = invoice.total.sub(invoice.amountPaid).toNumber();
                const toPay = Math.min(remainingAmount, pending);

                if (toPay > 0) {
                    // Create Payment linked to Account
                    const payment = await tx.payment.create({
                        data: {
                            saleId: invoice.id,
                            amount: toPay,
                            method: method,
                            notes: "Abono en Cascada (Mass Collection)",
                            reference: "CASCADA_" + new Date().getTime(),
                            accountId: accountId
                        }
                    });

                    // Update Sale
                    await tx.sale.update({
                        where: { id: invoice.id },
                        data: {
                            amountPaid: { increment: toPay }
                        }
                    });

                    // Create Ledger Transaction
                    await tx.transaction.create({
                        data: {
                            amount: toPay,
                            type: "INCOME",
                            category: "Cobranza / Venta",
                            description: `Abono Cliente: ${customerName} - Factura: ${invoice.invoiceNumber || invoice.id.slice(0, 8)}`,
                            accountId: accountId,
                            userId: user.id,
                            paymentId: payment.id,
                            date: new Date()
                        }
                    });

                    // Update Financial Account Balance
                    await tx.paymentAccount.update({
                        where: { id: accountId },
                        data: {
                            // @ts-ignore
                            balance: { increment: toPay }
                        }
                    });

                    remainingAmount -= toPay;
                    appliedPayments.push({
                        invoice: invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase(),
                        amount: toPay,
                        newBalance: pending - toPay
                    });
                }
            }

            // 3. Handle Overpayment (Credit Balance)
            if (remainingAmount > 0) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        // @ts-ignore
                        creditBalance: { increment: remainingAmount }
                    }
                });
            }
        });

        revalidatePath("/sales/collections");
        revalidatePath("/finance");
        return { success: true, appliedPayments, remainingCredit: remainingAmount };

    } catch (error) {
        console.error("Cascade Payment Error:", JSON.stringify(error, null, 2));
        if (error instanceof Error) {
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        }
        return { success: false, error: "Failed to process payment" };
    }
}

export async function getDashboardMetrics() {
    const allSales = await prisma.sale.findMany({
        where: {
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
        where: { creditBalance: { gt: 0 } },
        // @ts-ignore
        select: { id: true, name: true, creditBalance: true }
    });

    const now = new Date();
    const metrics = {
        totalReceivable: 0,
        overdueDebt: 0,
        // @ts-ignore
        creditBalances: customersWithCredit.reduce((acc, curr) => acc + curr.creditBalance.toNumber(), 0),
        customersWithCreditCount: customersWithCredit.length,
        aging: {
            "1-15": 0,
            "16-30": 0,
            "31-60": 0,
            "+90": 0
        },
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
    }>();

    allSales.forEach(sale => {
        const total = sale.total.toNumber();
        const paid = sale.amountPaid.toNumber();
        const balance = total - paid;

        if (balance > 0) {
            metrics.totalReceivable += balance;

            const daysOld = Math.floor((now.getTime() - sale.date.getTime()) / (1000 * 3600 * 24));

            // Aging Buckets
            if (daysOld <= 15) metrics.aging["1-15"] += balance;
            else if (daysOld <= 30) metrics.aging["16-30"] += balance;
            else if (daysOld <= 60) metrics.aging["31-60"] += balance;
            else metrics.aging["+90"] += balance;

            // Overdue Logic (>30 days)
            if (daysOld > 30) {
                metrics.overdueDebt += balance;
            }

            // Group by Customer for Top Debtors & Table
            if (!debtorsMap.has(sale.customerId)) {
                debtorsMap.set(sale.customerId, {
                    id: sale.customerId,
                    name: sale.customer.name,
                    phone: sale.customer.phone,
                    totalDebt: 0,
                    oldestInvoiceDate: sale.date,
                    invoicesCount: 0
                });
            }

            const debtor = debtorsMap.get(sale.customerId)!;
            debtor.totalDebt += balance;
            debtor.invoicesCount++;
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
