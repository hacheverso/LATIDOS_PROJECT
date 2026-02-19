"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { verifyOperatorPin } from "@/app/directory/team/actions";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

// --- Helpers ---

async function checkFinanceAccess() {
    const session = await auth();
    const role = session?.user?.role;
    // @ts-ignore
    const perms = session?.user?.permissions || {};

    if (role === 'ADMIN' || perms.canViewFinance) return true;

    throw new Error("Acceso denegado: Permisos insuficientes para gestionar finanzas.");
}

// --- ACCOUNTS ---

export async function getUniqueCategories(type?: "INCOME" | "EXPENSE") {
    const orgId = await getOrgId();
    // @ts-ignore
    const transactions = await prisma.transaction.findMany({
        where: {
            organizationId: orgId,
            ...(type ? { type } : {})
        },
        select: {
            category: true
        },
        distinct: ['category']
    });

    return transactions
        .map((t: any) => t.category)
        .filter((c: string) => c && c.trim() !== "");
}

export async function getPaymentAccounts(includeArchived = false) {
    const orgId = await getOrgId();
    // @ts-ignore
    return await prisma.paymentAccount.findMany({
        where: {
            organizationId: orgId,
            ...(includeArchived ? {} : { isArchived: false })
        },
        orderBy: { name: 'asc' }
    });
}

export async function createPaymentAccount(name: string, type: "CASH" | "BANK" | "WALLET" | "RETOMA" | "NOTA_CREDITO") {
    const orgId = await getOrgId();
    await checkFinanceAccess();

    // @ts-ignore
    await prisma.paymentAccount.create({
        data: { name, type, organizationId: orgId }
    });
    revalidatePath("/finance");
}

export async function updateAccount(accountId: string, data: { name?: string, icon?: string }) {
    const orgId = await getOrgId();
    // @ts-ignore
    await prisma.paymentAccount.update({
        where: { id: accountId, organizationId: orgId },
        data
    });
    revalidatePath("/finance");
}

export async function archiveAccount(accountId: string) {
    const orgId = await getOrgId();

    // Check for balance or recent activity if strict safety is needed
    // For now, Antigravity logic says "Archivar" hides it, doesn't delete functionality.

    // @ts-ignore
    await prisma.paymentAccount.update({
        where: { id: accountId, organizationId: orgId },
        data: { isArchived: true }
    });
    revalidatePath("/finance");
}

export async function unarchiveAccount(accountId: string) {
    const orgId = await getOrgId();
    // @ts-ignore
    await prisma.paymentAccount.update({
        where: { id: accountId, organizationId: orgId },
        data: { isArchived: false }
    });
    revalidatePath("/finance");
}

export async function deleteAccount(accountId: string) {
    const orgId = await getOrgId();
    // Check if empty
    // @ts-ignore
    const account = await prisma.paymentAccount.findFirst({
        where: { id: accountId, organizationId: orgId },
        include: { transactions: { take: 1 } }
    });

    // @ts-ignore
    if (account?.transactions.length > 0 || Number(account?.balance) !== 0) {
        throw new Error("No se puede eliminar una cuenta con movimientos o saldo. Úsa la opción 'Archivar'.");
    }

    // @ts-ignore
    await prisma.paymentAccount.delete({
        where: { id: accountId, organizationId: orgId }
    });
    revalidatePath("/finance");
}

export async function getFinanceMetrics(
    page = 1,
    limit = 50,
    filters: { pendingOnly?: boolean } = {}
) {
    const orgId = await getOrgId();
    // @ts-ignore
    const accounts = await prisma.paymentAccount.findMany({
        where: {
            organizationId: orgId
        },
        orderBy: { name: 'asc' }
    });
    // @ts-ignore
    const totalAvailable = accounts
        .filter((acc: any) => !acc.isArchived)
        .reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);

    // Recent Transactions with Pagination & Filtering
    const whereClause: any = { organizationId: orgId };

    if (filters.pendingOnly) {
        whereClause.isVerified = false;
    }

    // @ts-ignore
    const totalTransactions = await prisma.transaction.count({
        where: whereClause
    });

    // @ts-ignore
    const recentTransactions = await prisma.transaction.findMany({
        where: whereClause,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { date: 'desc' },
        include: {
            account: true,
            user: true,
            // Include Payment -> Sale -> Customer link for Client Name
            payment: {
                include: {
                    sale: {
                        include: {
                            customer: { select: { name: true } }
                        }
                    }
                }
            }
        }
    });

    return {
        accounts,
        totalAvailable,
        recentTransactions,
        pagination: {
            page,
            limit,
            total: totalTransactions,
            totalPages: Math.ceil(totalTransactions / limit)
        }
    };
}

export async function toggleTransactionVerification(transactionId: string) {
    const orgId = await getOrgId();
    await checkFinanceAccess();

    const tx = await prisma.transaction.findFirst({
        where: { id: transactionId, organizationId: orgId }
    });

    if (!tx) throw new Error("Transacción no encontrada.");

    await prisma.transaction.update({
        where: { id: transactionId },
        data: { isVerified: !(tx as any).isVerified }
    });

    revalidatePath("/finance");
}

// --- TRANSACTIONS ---

export async function createTransaction(data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    description: string;
    category: string;
    accountId: string;
    date?: Date;
    operatorId?: string; // Dual Identity
    pin?: string;        // Dual Identity Validation
}) {
    const orgId = await getOrgId();
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");
    await checkFinanceAccess();

    const user = await prisma.user.findFirst({ where: { email: session.user.email, organizationId: orgId } });
    if (!user) throw new Error("User not found or unauthorized");

    if (data.amount <= 0) throw new Error("Amount must be positive");

    // Verify Operator if provided (Dual Identity Force)
    let operatorNameSnapshot = undefined;
    let finalUserId = user.id;

    if (data.operatorId) {
        if (!data.pin) throw new Error("PIN de operador requerido.");
        const verification = await verifyOperatorPin(data.operatorId, data.pin);
        if (!verification.success) throw new Error(verification.error || "PIN de operador inválido.");
        operatorNameSnapshot = verification.name;
        if (verification.userId) finalUserId = verification.userId;
    }

    // Validate Account
    const account = await prisma.paymentAccount.findFirst({ where: { id: data.accountId, organizationId: orgId } });
    if (!account) throw new Error("Account not found");

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
                organizationId: orgId, // Crucial
                date: data.date || new Date(),
                operatorId: data.operatorId,
                operatorName: operatorNameSnapshot
            }
        });

        // 2. Update Balance
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

export async function getAccountDetails(accountId: string, startDate?: string, endDate?: string) {
    const orgId = await getOrgId();
    // @ts-ignore
    const account = await prisma.paymentAccount.findFirst({
        where: { id: accountId, organizationId: orgId }
    });

    if (!account) throw new Error("Account not found");

    const where: any = { accountId, organizationId: orgId };

    if (startDate && endDate) {
        where.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }

    // @ts-ignore
    const transactions = await prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } }
    });

    const income = transactions
        // @ts-ignore
        .filter(t => t.type === 'INCOME')
        // @ts-ignore
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
        // @ts-ignore
        .filter(t => t.type === 'EXPENSE')
        // @ts-ignore
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
        account,
        transactions,
        periodSummary: {
            income,
            expense,
            net: income - expense
        }
    };
}

export async function transferFunds(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string = "Transferencia entre cuentas",
    operatorId?: string,
    pin?: string
) {
    const orgId = await getOrgId();
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };
    try {
        await checkFinanceAccess();
    } catch (e: any) {
        return { success: false, error: e.message };
    }

    // @ts-ignore
    const user = await prisma.user.findFirst({ where: { email: session.user.email, organizationId: orgId } });
    if (!user) return { success: false, error: "User not found" };

    if (amount <= 0) return { success: false, error: "Amount must be positive" };
    if (fromAccountId === toAccountId) return { success: false, error: "Cannot transfer to same account" };

    // Validate Operator if present
    let operatorNameSnapshot = undefined;
    let finalUserId = user.id;

    if (operatorId) {
        if (!pin) return { success: false, error: "PIN de operador requerido." };
        const verification = await verifyOperatorPin(operatorId, pin);
        if (!verification.success) return { success: false, error: verification.error || "PIN inválido" };
        operatorNameSnapshot = verification.name;
        if (verification.userId) finalUserId = verification.userId;
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Validate Accounts are in same Org
            const fromAcc = await tx.paymentAccount.findFirst({ where: { id: fromAccountId, organizationId: orgId } });
            const toAcc = await tx.paymentAccount.findFirst({ where: { id: toAccountId, organizationId: orgId } });

            if (!fromAcc || !toAcc) throw new Error("Cuentas no encontradas o inválidas");

            // 1. Create Outgoing Transaction (Source)
            // @ts-ignore
            await tx.transaction.create({
                data: {
                    amount: amount,
                    type: "EXPENSE",
                    category: "Transferencia Saliente",
                    description: `Transferencia a: ${toAcc.name} - ${description}`,
                    accountId: fromAccountId,
                    userId: finalUserId,
                    organizationId: orgId,
                    toAccountId: toAccountId,
                    operatorId: operatorId,
                    operatorName: operatorNameSnapshot
                }
            });

            // 2. Decrement Source Balance
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: amount } }
            });

            // 3. Create Incoming Transaction (Destination)
            // @ts-ignore
            await tx.transaction.create({
                data: {
                    amount: amount,
                    type: "INCOME",
                    category: "Transferencia Entrante",
                    description: `Transferencia de: ${fromAcc.name} - ${description}`,
                    accountId: toAccountId,
                    userId: finalUserId,
                    organizationId: orgId,
                    operatorId: operatorId,
                    operatorName: operatorNameSnapshot
                }
            });

            // 4. Increment Destination Balance
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: toAccountId },
                data: { balance: { increment: amount } }
            });
        });

        revalidatePath("/finance");
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function getCustomerStatement(customerId: string, startDate?: string, endDate?: string) {
    const orgId = await getOrgId();

    // 1. Fetch Customer
    // @ts-ignore
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId },
        select: { id: true, name: true, phone: true, creditBalance: true, taxId: true }
    });

    if (!customer) throw new Error("Customer not found or unauthorized");

    // 2. Build Date Filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
    }

    // 3. Fetch Sales (Debits) - implicitly scoped by Customer being in Org
    // @ts-ignore
    const sales = await prisma.sale.findMany({
        where: {
            customerId,
            organizationId: orgId, // Explicit redundancy safety
            ...(startDate || endDate ? { date: dateFilter } : {})
        },
        orderBy: { date: 'asc' }
    });

    // 4. Fetch Payments (Credits)
    // @ts-ignore
    const payments = await prisma.payment.findMany({
        where: {
            sale: { customerId, organizationId: orgId },
            organizationId: orgId,
            ...(startDate || endDate ? { date: dateFilter } : {})
        },
        include: { sale: { select: { id: true } } },
        orderBy: { date: 'asc' }
    });

    // 5. Merge and Transform
    const movements = [
        ...sales.map(s => ({
            id: s.id,
            date: s.date,
            concept: s.invoiceNumber ? `Factura de Venta #${s.invoiceNumber}` : `Factura de Venta`,
            type: 'DEBIT',
            method: 'CREDITO',
            debit: Number(s.total),
            credit: 0,
            isVerified: s.isVerified,
            detailsId: s.id, // For linking
            invoiceNumber: s.invoiceNumber
        })),
        ...payments.map(p => ({
            id: p.id,
            date: p.date,
            concept: p.reference ? `Abono / Pago #${p.reference}` : `Abono / Pago`,
            type: 'CREDIT',
            method: p.method,
            debit: 0,
            credit: Number(p.amount),
            isVerified: p.isVerified,
            detailsId: null // Payments might not have a direct detail view yet
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 6. Calculate Running Balance
    let runningBalance = 0;
    const result = movements.map(m => {
        runningBalance = runningBalance + m.debit - m.credit;
        return { ...m, balance: runningBalance };
    });

    return {
        customer: {
            ...customer,
            creditBalance: Number(customer.creditBalance)
        },
        movements: result,
        summary: {
            totalDebit: sales.reduce((sum, s) => sum + Number(s.total), 0),
            totalCredit: payments.reduce((sum, p) => sum + Number(p.amount), 0),
            finalBalance: runningBalance
        }
    };
}

export async function toggleVerification(id: string, type: 'DEBIT' | 'CREDIT', status: boolean) {
    const orgId = await getOrgId();
    const session = await auth();
    // Allow ADMIN and probably STAFF/FINANCE roles. For now restricted to non-null user.
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    // Permission check
    try {
        await checkFinanceAccess();
    } catch (e: any) {
        return { success: false, error: e.message };
    }

    try {
        if (type === 'DEBIT') {
            // Sale
            // @ts-ignore
            const sale = await prisma.sale.findFirst({ where: { id, organizationId: orgId } });
            if (!sale) throw new Error("Sale not found");
            // @ts-ignore
            await prisma.sale.update({
                where: { id },
                data: { isVerified: status }
            });
        } else {
            // Payment
            // @ts-ignore
            const payment = await prisma.payment.findFirst({ where: { id, organizationId: orgId } });
            if (!payment) throw new Error("Payment not found");
            // @ts-ignore
            await prisma.payment.update({
                where: { id },
                data: { isVerified: status }
            });
        }

        revalidatePath("/finance/reconciliation");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
