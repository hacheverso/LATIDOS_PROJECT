"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { verifyOperatorPin } from "@/app/directory/team/actions";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;
    if (!orgId) throw new Error("Acceso denegado: No se encontró ID de organización.");
    return orgId as string;
}

// MASTER PAYMENT FUNCTION
// Handles Single Payments, Bulk Payments, Cascading Logic, and Credit Balances.
export async function registerUnifiedPayment(data: {
    invoiceIds: string[]; // Supports 1 or Many
    amount: number;
    method: string;
    accountId: string; // Required for external money, ignored for "SALDO A FAVOR"
    reference?: string;
    notes?: string;
    saveExcessAsCredit?: boolean;
    operatorId?: string; // Dual Identity
    pin?: string;        // Dual Identity Validation
}) {
    const orgId = await getOrgId();
    const session = await auth();

    // Verify Operator if provided (Dual Identity Force)
    let operatorNameSnapshot = undefined;
    if (data.operatorId) {
        if (!data.pin) throw new Error("PIN de operador requerido.");
        const verification = await verifyOperatorPin(data.operatorId, data.pin);
        if (!verification.success) throw new Error(verification.error || "PIN de operador inválido.");
        operatorNameSnapshot = verification.name;
    }

    if (!data.invoiceIds || data.invoiceIds.length === 0) throw new Error("No hay facturas seleccionadas.");
    if (data.amount <= 0) throw new Error("El monto debe ser mayor a 0.");

    return await prisma.$transaction(async (tx) => {
        // 1. Fetch all sales with their current debt
        const sales = await tx.sale.findMany({
            where: {
                id: { in: data.invoiceIds },
                organizationId: orgId
            },
            orderBy: { date: "asc" } // FIFO
        });

        if (sales.length === 0) throw new Error("No se encontraron las facturas.");

        const customerId = sales[0].customerId;
        let remainingToDistribute = data.amount;

        // 2. Handle "SALDO A FAVOR" Logic
        if (data.method === "SALDO A FAVOR") {
            const customer = await tx.customer.findFirst({
                where: { id: customerId, organizationId: orgId }
            });
            if (!customer || customer.creditBalance.toNumber() < data.amount) {
                throw new Error("Saldo a favor insuficiente.");
            }
            // Decrement customer credit
            await tx.customer.update({
                where: { id: customerId },
                data: { creditBalance: { decrement: data.amount } }
            });
        } else {
            // It's a real payment (Cash/Bank), update account balance
            if (!data.accountId) throw new Error("Cuenta de destino requerida para cobros externos.");

            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: data.accountId, organizationId: orgId },
                data: { balance: { increment: data.amount } }
            });
        }

        // 3. Distribution Loop (Cascading)
        for (const sale of sales) {
            if (remainingToDistribute <= 0) break;

            const pending = sale.total.toNumber() - sale.amountPaid.toNumber();
            if (pending <= 0) continue;

            const allocation = Math.min(remainingToDistribute, pending);

            // Create Payment record
            const payment = await tx.payment.create({
                data: {
                    saleId: sale.id,
                    amount: allocation,
                    method: data.method,
                    accountId: data.method !== "SALDO A FAVOR" ? data.accountId : null,
                    reference: data.reference,
                    notes: data.notes || (data.invoiceIds.length > 1 ? "Cobro Masivo" : "Cobro Individual"),
                    organizationId: orgId,
                    operatorId: data.operatorId,
                    operatorName: operatorNameSnapshot
                }
            });

            // Update Sale Header
            await tx.sale.update({
                where: { id: sale.id },
                data: {
                    amountPaid: { increment: allocation },
                    lastModifiedBy: session?.user?.name || "System",
                    modificationReason: "Abono registrado"
                }
            });

            // Track Transaction if external
            if (data.method !== "SALDO A FAVOR") {
                // @ts-ignore
                await tx.transaction.create({
                    data: {
                        accountId: data.accountId,
                        amount: allocation,
                        type: "INCOME",
                        description: `Cobro Factura ${sale.invoiceNumber || sale.id.slice(-6)}`,
                        paymentId: payment.id,
                        organizationId: orgId,
                        userId: session?.user?.id || "",
                        category: "VENTA", // Required
                        operatorId: data.operatorId,
                        operatorName: operatorNameSnapshot
                    }
                });
            }

            remainingToDistribute -= allocation;
        }

        // 4. Excess handling (Credit Balance)
        if (remainingToDistribute > 0 && data.saveExcessAsCredit) {
            await tx.customer.update({
                where: { id: customerId },
                data: { creditBalance: { increment: remainingToDistribute } }
            });
        }

        return { success: true, distributed: data.amount - remainingToDistribute, excess: remainingToDistribute };
    });
}

// SHIM: Compatibility wrapper for single payment calls
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
        ...data
    });
}

// SHIM: Compatibility wrapper for bulk calls
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
        amount: data.totalAmount,
        ...data
    });
}

export async function getSaleDetails(saleId: string) {
    const orgId = await getOrgId();
    const sale = await prisma.sale.findFirst({
        where: { id: saleId, organizationId: orgId },
        include: {
            customer: true,
            instances: {
                include: { product: true }
            },
            payments: {
                include: { transaction: true },
                orderBy: { date: "desc" }
            }
        }
    });

    if (!sale) throw new Error("Factura no encontrada.");

    return {
        ...sale,
        total: sale.total.toNumber(),
        amountPaid: sale.amountPaid.toNumber(),
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
            transactionId: p.transaction ? (Array.isArray(p.transaction) ? p.transaction[0]?.id : p.transaction.id) : null
        }))
    };
}

export async function updatePayment(
    paymentId: string,
    amount: number,
    reason: string,
    method: string,
    accountId: string
) {
    const orgId = await getOrgId();
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") throw new Error("Acceso denegado. Se requiere ser Administrador.");

    if (!reason || reason.length < 5) throw new Error("Debe proporcionar una razón válida.");

    return await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
            where: { id: paymentId, organizationId: orgId },
            include: { sale: true }
        });

        if (!payment) throw new Error("Pago no encontrado.");

        const oldAmount = payment.amount.toNumber();
        const oldAccountId = payment.accountId;

        // 1. Revert Old Financial Impact
        if (oldAccountId) {
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: oldAccountId },
                data: { balance: { decrement: oldAmount } }
            });

            // Delete associated transactions
            // @ts-ignore
            await tx.transaction.deleteMany({
                where: { paymentId: paymentId }
            });
        }

        // 2. Apply New Financial Impact
        if (accountId) {
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: accountId },
                data: { balance: { increment: amount } }
            });

            // Create new transaction
            // @ts-ignore
            await tx.transaction.create({
                data: {
                    accountId: accountId,
                    amount: amount,
                    type: "INCOME",
                    description: `Abono Editado: ${reason}`,
                    paymentId: paymentId,
                    organizationId: orgId,
                    userId: session?.user?.id || "",
                    category: "ABONO" // Required
                }
            });
        }

        // 3. Update Sale amountPaid
        const diff = amount - oldAmount;
        const newPaid = payment.sale.amountPaid.toNumber() + diff;

        await tx.sale.update({
            where: { id: payment.saleId },
            data: { amountPaid: newPaid }
        });

        // 4. Update Payment record
        await tx.payment.update({
            where: { id: paymentId },
            data: {
                amount: amount,
                method: method,
                accountId: accountId,
                notes: reason
            }
        });

        return { success: true };
    });
}

export async function deletePayment(paymentId: string, reason: string, signatureOverride?: { operatorId: string; pin: string }) {
    const orgId = await getOrgId();
    const session = await auth();

    let authorized = false;

    // 1. Verify Digital Signature (Operator)
    if (signatureOverride?.operatorId && signatureOverride?.pin) {
        const verification = await verifyOperatorPin(signatureOverride.operatorId, signatureOverride.pin);
        if (verification.success) {
            authorized = true;
        } else {
            throw new Error(verification.error || "PIN de operador inválido.");
        }
    }

    // 2. Verify Session (Admin)
    if (!authorized) {
        // @ts-ignore
        if (session?.user?.role === "ADMIN") {
            authorized = true;
        }
    }

    if (!authorized) throw new Error("Acceso denegado. Se requiere ser Administrador o Firma de Operador.");

    if (!reason || reason.length < 5) throw new Error("Debe proporcionar una razón válida para la eliminación.");

    return await prisma.$transaction(async (tx) => {
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

            // Delete Transactions
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

        return { success: true };
    });
}

export async function checkUserRole() {
    const session = await auth();
    // @ts-ignore
    return session?.user?.role || "GESTION_OPERATIVA";
}

export async function getCustomerCredit(customerId: string) {
    const orgId = await getOrgId();
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId },
        select: { creditBalance: true }
    });
    return customer?.creditBalance.toNumber() || 0;
}
