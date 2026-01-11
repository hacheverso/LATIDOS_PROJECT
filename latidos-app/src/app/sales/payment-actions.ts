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

/**
 * MASTER PAYMENT FUNCTION
 * Handles Single Payments, Bulk Payments, Cascading Logic, and Credit Balances.
 */
export async function registerUnifiedPayment(data: {
    invoiceIds: string[]; // Supports 1 or Many
    amount: number;
    method: string;
    accountId: string; // Required for external money, ignored for "SALDO A FAVOR"
    reference?: string;
    notes?: string;
    saveExcessAsCredit?: boolean;
}) {
    const orgId = await getOrgId();
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.email) throw new Error("No autorizado");

    // @ts-ignore
    const user = await prisma.user.findFirst({ where: { email: session.user.email, organizationId: orgId } });
    if (!user) throw new Error("Usuario no encontrado");

    if (data.amount <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!data.accountId && data.method !== "SALDO A FAVOR") throw new Error("Debe seleccionar una Cuenta de Pago.");

    return await prisma.$transaction(async (tx) => {
        // 1. Fetch Invoices
        // @ts-ignore
        const invoices = await tx.sale.findMany({
            where: {
                id: { in: data.invoiceIds },
                organizationId: orgId  // Security Check
            },
            include: { customer: true },
            orderBy: { date: 'asc' } // OLDEST FIRST for cascading
        });

        if (invoices.length === 0) throw new Error("No se encontraron facturas válidas.");

        // Verify all belong to same customer if multiple (Basic sanity check)
        const firstCustomerId = invoices[0].customerId;
        if (invoices.some(inv => inv.customerId !== firstCustomerId)) {
            throw new Error("No se pueden procesar pagos de múltiples clientes simultáneamente.");
        }

        let remainingMoney = data.amount;
        let totalChange = 0;
        let totalCreditGenerated = 0;

        // CHECK IF PAYING WITH "SALDO A FAVOR"
        if (data.method === "SALDO A FAVOR") {
            // @ts-ignore
            const customer = await tx.customer.findFirst({ where: { id: firstCustomerId, organizationId: orgId } });
            // @ts-ignore
            if (!customer || customer.creditBalance < remainingMoney) {
                // @ts-ignore
                throw new Error(`Saldo insuficiente. El cliente tiene: $${(customer?.creditBalance?.toNumber() || 0).toLocaleString()}`);
            }

            // Deduct from Customer Balance Upfront
            // @ts-ignore
            await tx.customer.update({
                where: { id: firstCustomerId },
                data: { creditBalance: { decrement: remainingMoney } }
            });
        }

        // 2. Iterate and Pay
        for (const invoice of invoices) {
            if (remainingMoney <= 0) break;

            const pending = invoice.total.toNumber() - invoice.amountPaid.toNumber();
            if (pending <= 0) continue; // Already paid

            const paymentAmount = Math.min(remainingMoney, pending);

            // Register Payment
            // @ts-ignore
            const newPayment = await tx.payment.create({
                data: {
                    saleId: invoice.id,
                    amount: paymentAmount,
                    method: data.method,
                    reference: data.reference,
                    notes: data.notes ? (data.notes + (invoices.length > 1 ? " | Pago Múltiple" : "")) : undefined,
                    date: new Date(),
                    accountId: data.method === "SALDO A FAVOR" ? null : data.accountId,
                    organizationId: orgId // Linked to Org
                } as any
            });

            // Update Sale
            // @ts-ignore
            await tx.sale.update({
                where: { id: invoice.id },
                data: { amountPaid: { increment: paymentAmount } }
            });

            // Create Transaction (Only if REAL money coming in, not Credit usage)
            if (data.method !== "SALDO A FAVOR") {
                // @ts-ignore
                await tx.transaction.create({
                    data: {
                        amount: paymentAmount,
                        type: "INCOME",
                        description: `Abono Fac #${invoice.invoiceNumber || invoice.id.slice(0, 8)}`,
                        category: "Ventas",
                        accountId: data.accountId,
                        paymentId: newPayment.id,
                        userId: user.id,
                        organizationId: orgId, // Linked to Org
                        date: new Date()
                    }
                });
            }

            remainingMoney -= paymentAmount;
        }

        // 3. Handle Excess Logic (Overpayment)
        if (remainingMoney > 0) {
            if (data.saveExcessAsCredit) {
                // Add to Credit
                // @ts-ignore
                await tx.customer.update({
                    where: { id: firstCustomerId },
                    data: { creditBalance: { increment: remainingMoney } }
                });

                // Record Transaction for the surplus (It entered the account!)
                if (data.method !== "SALDO A FAVOR") {
                    // @ts-ignore
                    await tx.transaction.create({
                        data: {
                            amount: remainingMoney,
                            type: "INCOME",
                            description: `Saldo a Favor (Excedente Abono)`,
                            category: "Depósitos Cliente",
                            accountId: data.accountId,
                            userId: user.id,
                            organizationId: orgId,
                            date: new Date()
                        }
                    });
                }
                totalCreditGenerated = remainingMoney;
            } else {
                totalChange = remainingMoney;
            }
        }

        // 4. Update Account Balance (Aggregate)
        if (data.method !== "SALDO A FAVOR") {
            const moneyKept = data.amount - totalChange; // If we returned change, it didn't stay.
            if (moneyKept > 0) {
                // Verify Account Org (Implicit via Transaction but safer to check)
                const acc = await tx.paymentAccount.findFirst({ where: { id: data.accountId, organizationId: orgId } });
                if (!acc) throw new Error("Cuenta no disponible.");

                // @ts-ignore
                await tx.paymentAccount.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: moneyKept } }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/finance");

        return { success: true, change: totalChange, creditGenerated: totalCreditGenerated };
    });
}

/**
 * SHIM: Compatibility wrapper for single payment calls
 */
export async function registerPayment(data: {
    saleId: string;
    amount: number;
    method: string;
    accountId: string;
    reference?: string;
    notes?: string;
    saveExcessAsCredit?: boolean;
}) {
    return registerUnifiedPayment({
        invoiceIds: [data.saleId],
        amount: data.amount,
        method: data.method,
        accountId: data.accountId,
        reference: data.reference,
        notes: data.notes,
        saveExcessAsCredit: data.saveExcessAsCredit
    });
}

/**
 * SHIM: Compatibility wrapper for bulk calls
 */
export async function processCascadingPayment(data: {
    invoiceIds: string[];
    totalAmount: number;
    method: string;
    accountId: string;
    reference?: string;
    notes?: string;
    saveExcessAsCredit?: boolean;
}) {
    return registerUnifiedPayment({
        ...data,
        amount: data.totalAmount
    });
}

// ... EXISTING UTILS ...

export async function getSaleDetails(saleId: string) {
    const orgId = await getOrgId();
    const sale = await prisma.sale.findFirst({
        where: { id: saleId, organizationId: orgId },
        include: {
            customer: true,
            instances: {
                include: {
                    product: true
                }
            },
            payments: {
                orderBy: { date: 'desc' },
                include: {
                    transaction: true
                }
            },
        }
    });

    if (!sale) return null;

    // Serialize
    const total = sale.total.toNumber();
    const amountPaid = sale.amountPaid.toNumber();
    const balance = total - amountPaid;

    let status = 'PENDING';
    if (balance <= 0) status = 'PAID';
    else if (amountPaid > 0) status = 'PARTIAL';

    return {
        ...sale,
        total,
        amountPaid,
        balance,
        status,
        date: sale.date.toISOString(),
        customer: {
            ...sale.customer,
            creditBalance: sale.customer.creditBalance?.toNumber() || 0,
            createdAt: sale.customer.createdAt.toISOString(),
            updatedAt: sale.customer.updatedAt.toISOString()
        },
        instances: sale.instances.map(i => ({
            ...i,
            cost: i.cost?.toNumber() || 0,
            originalCost: i.originalCost?.toNumber() || 0,
            soldPrice: i.soldPrice?.toNumber() || 0,
            product: {
                ...i.product,
                basePrice: i.product.basePrice.toNumber()
            }
        })),
        payments: sale.payments.map(p => ({
            ...p,
            amount: p.amount.toNumber(),
            date: p.date.toISOString(),
            // @ts-ignore
            transactionId: p.transaction ? p.transaction[0]?.id : null
        }))
    };
}

export async function deletePayment(paymentId: string, reason: string) {
    const orgId = await getOrgId();
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") throw new Error("Acceso denegado. Se requiere ser Administrador.");

    if (!reason || reason.length < 5) throw new Error("Debe proporcionar una razón válida para la eliminación.");

    await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
            where: { id: paymentId, organizationId: orgId },
            include: { sale: true }
        });

        if (!payment) throw new Error("Pago no encontrado.");

        // Revert Balance
        if (payment.accountId) {
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: payment.accountId },
                data: { balance: { decrement: payment.amount } }
            });

            // Delete Transaction
            // @ts-ignore
            await tx.transaction.deleteMany({
                where: { paymentId: paymentId }
            });
        }

        // Revert Sale
        const currentPaid = payment.sale.amountPaid.toNumber();
        const newPaid = currentPaid - payment.amount.toNumber();

        await tx.sale.update({
            where: { id: payment.saleId },
            data: { amountPaid: newPaid }
        });

        // Delete Payment
        await tx.payment.delete({ where: { id: paymentId } });
    });

    revalidatePath("/sales");
    revalidatePath("/finance");
    return { success: true };
}

export async function checkUserRole() {
    const session = await auth();
    // @ts-ignore
    return session?.user?.role || "STAFF";
}

export async function getCustomerCredit(customerId: string) {
    const orgId = await getOrgId();
    // Verify Org
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId },
        select: { creditBalance: true }
    });
    return customer?.creditBalance.toNumber() || 0;
}
