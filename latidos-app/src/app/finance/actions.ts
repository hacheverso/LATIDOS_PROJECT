"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// --- ACCOUNTS ---

export async function getPaymentAccounts() {
    // @ts-ignore
    return await prisma.paymentAccount.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createPaymentAccount(name: string, type: "CASH" | "BANK" | "WALLET") {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

    // @ts-ignore
    await prisma.paymentAccount.create({
        data: { name, type }
    });
    revalidatePath("/finance");
}

export async function getFinanceMetrics() {
    // @ts-ignore
    const accounts = await prisma.paymentAccount.findMany();
    // @ts-ignore
    const totalAvailable = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // Recent Transactions
    // @ts-ignore
    const recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { date: 'desc' },
        include: { account: true, user: true }
    });

    return { accounts, totalAvailable, recentTransactions };
}

// --- TRANSACTIONS ---

export async function createTransaction(data: {
    amount: number;
    type: "INCOME" | "EXPENSE"; // Transfer handle separate or specific type
    description: string;
    category: string;
    accountId: string;
    date?: Date;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    if (data.amount <= 0) throw new Error("Amount must be positive");

    await prisma.$transaction(async (tx) => {
        // 1. Create Transaction
        // @ts-ignore
        await tx.transaction.create({
            data: {
                amount: data.amount,
                type: data.type,
                description: data.description,
                category: data.category,
                accountId: data.accountId,
                userId: user.id,
                date: data.date || new Date()
            }
        });

        // 2. Update Balance
        // Income adds, Expense subtracts
        const balanceChange = data.type === "INCOME" ? data.amount : -data.amount;

        // @ts-ignore
        await tx.paymentAccount.update({
            where: { id: data.accountId },
            data: {
                balance: { increment: balanceChange }
            }
        });
    });

    revalidatePath("/finance");
}
