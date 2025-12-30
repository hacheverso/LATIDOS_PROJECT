"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

export async function registerPayment(data: {
    saleId: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    accountId: string; // REQUIRED NOW
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("No autorizado");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("Usuario no encontrado");

    if (data.amount <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!data.accountId) throw new Error("Debe seleccionar una Cuenta de Pago.");

    const payment = await prisma.$transaction(async (tx) => {
        // 0. Fetch Sale and Calculate Balance
        // @ts-ignore
        const currentSale = await tx.sale.findUnique({
            where: { id: data.saleId },
            include: { customer: true }
        });
        if (!currentSale) throw new Error("Venta no encontrada");

        // @ts-ignore
        const pendingBalance = currentSale.total.toNumber() - currentSale.amountPaid.toNumber();
        const totalCash = data.amount;

        let paymentAmount = totalCash;
        let creditAmount = 0;

        if (totalCash > pendingBalance) {
            paymentAmount = pendingBalance; // Max out at balance
            creditAmount = totalCash - pendingBalance;
        }

        // 1. Create Payment (Only for the invoice amount)
        if (paymentAmount > 0) {
            // @ts-ignore
            const newPayment = await tx.payment.create({
                data: {
                    saleId: data.saleId,
                    amount: paymentAmount,
                    method: data.method,
                    reference: data.reference,
                    notes: data.notes,
                    date: new Date(),
                    accountId: data.accountId
                } as any
            });

            // 2. Create Transaction for Sale Income
            // @ts-ignore
            await tx.transaction.create({
                data: {
                    amount: paymentAmount,
                    type: "INCOME",
                    description: `Abono Venta #${data.saleId.slice(0, 8)}`,
                    category: "Ventas",
                    accountId: data.accountId,
                    paymentId: newPayment.id,
                    userId: user.id,
                    date: new Date()
                }
            });

            // 3. Update Sale Amount Paid
            // @ts-ignore
            await tx.sale.update({
                where: { id: data.saleId },
                data: { amountPaid: { increment: paymentAmount } }
            });

            // Return payment object (shimmed)
            // @ts-ignore
            if (creditAmount === 0) return newPayment;
        }

        // 4. Handle Credit Balance (Excess)
        if (creditAmount > 0) {
            // Update Customer Credit
            // @ts-ignore
            await tx.customer.update({
                where: { id: currentSale.customerId },
                data: { creditBalance: { increment: creditAmount } }
            });

            // Create Transaction for Credit Deposit (Unearned Revenue / Liability)
            // @ts-ignore
            await tx.transaction.create({
                data: {
                    amount: creditAmount,
                    type: "INCOME",
                    description: `Saldo a Favor Generado (Excedente Venta #${data.saleId.slice(0, 8)})`,
                    category: "Depósitos Cliente",
                    accountId: data.accountId,
                    userId: user.id,
                    date: new Date()
                }
            });
        }

        // 5. Update Account Balance (Total Money In)
        // @ts-ignore
        await tx.paymentAccount.update({
            where: { id: data.accountId },
            data: { balance: { increment: totalCash } }
        });

        // Return generic success if split
        return { success: true };
    });

    revalidatePath(`/sales/${data.saleId}`);
    revalidatePath("/sales");
    revalidatePath("/finance"); // Update Finance Dashboard

    return payment;
}

export async function getSaleDetails(saleId: string) {
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            customer: true,
            instances: {
                include: {
                    product: true
                }
            },
            payments: {
                orderBy: { date: 'desc' }
            },
            audits: {
                orderBy: { createdAt: 'desc' }
            }
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
        status, // Computed field
        date: sale.date.toISOString(),
        customer: {
            ...sale.customer,
            createdAt: sale.customer.createdAt.toISOString(),
            updatedAt: sale.customer.updatedAt.toISOString()
        },
        instances: sale.instances.map(i => ({
            ...i,
            cost: i.cost?.toNumber() || 0,
            originalCost: i.originalCost?.toNumber() || 0,
            soldPrice: i.soldPrice?.toNumber() || 0, // Fix serialization
            product: {
                ...i.product,
                basePrice: i.product.basePrice.toNumber()
            }
        })),
        payments: sale.payments.map(p => ({
            ...p,
            amount: p.amount.toNumber(),
            date: p.date.toISOString()
        }))
    };
}

export async function deletePayment(paymentId: string, reason: string) {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") throw new Error("Acceso denegado. Se requiere ser Administrador.");

    if (!reason || reason.length < 5) throw new Error("Debe proporcionar una razón válida para la eliminación.");

    await prisma.$transaction(async (tx) => {
        // 1. Find Payment
        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { sale: true }
        });

        if (!payment) throw new Error("Pago no encontrado.");

        // 2. Revert Balance (Separate Logic for INCOME vs EXPENSE if needed, currently assumes payment is positive INCOME)
        // Verify Account exists
        if (payment.accountId) {
            // @ts-ignore
            await tx.paymentAccount.update({
                where: { id: payment.accountId },
                data: { balance: { decrement: payment.amount } }
            });

            // 3. Delete Linked Transaction
            // @ts-ignore
            await tx.transaction.deleteMany({
                where: { paymentId: paymentId }
            });
        }

        // 4. Update Sale
        const currentPaid = payment.sale.amountPaid.toNumber();
        const newPaid = currentPaid - payment.amount.toNumber();

        await tx.sale.update({
            where: { id: payment.saleId },
            data: {
                amountPaid: newPaid
            }
        });

        // 5. Delete Payment
        await tx.payment.delete({
            where: { id: paymentId }
        });
    });



    revalidatePath("/sales");
    revalidatePath("/finance");
    return { success: true };
}

export async function updatePayment(paymentId: string, newAmount: number, reason: string, newMethod?: string, newAccountId?: string) {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") throw new Error("Acceso denegado. Se requiere ser Administrador.");

    if (newAmount <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!reason || reason.length < 5) throw new Error("Debe proporcionar una razón válida.");

    await prisma.$transaction(async (tx) => {
        // 1. Find Payment
        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { sale: true }
        });

        if (!payment) throw new Error("Pago no encontrado.");

        const oldAmount = payment.amount.toNumber();
        const oldAccountId = payment.accountId;

        // Handle Account Change or Amount Change
        const accountChanged = newAccountId && newAccountId !== oldAccountId;
        const amountChanged = newAmount !== oldAmount;

        if (accountChanged || amountChanged) {
            // Revert Old Impact
            if (oldAccountId) {
                // @ts-ignore
                await tx.paymentAccount.update({
                    where: { id: oldAccountId },
                    data: { balance: { decrement: oldAmount } }
                });
            }

            // Apply New Impact
            const targetAccountId = accountChanged ? newAccountId : oldAccountId;
            if (targetAccountId) {
                // @ts-ignore
                await tx.paymentAccount.update({
                    where: { id: targetAccountId },
                    data: { balance: { increment: newAmount } }
                });
            }

            // Update Transaction
            // If account changed, we might need to update the transaction's accountId as well
            if (oldAccountId) {
                // @ts-ignore
                await tx.transaction.updateMany({
                    where: { paymentId: paymentId },
                    data: {
                        amount: newAmount,
                        // @ts-ignore
                        accountId: targetAccountId // Move transaction to active account
                    }
                });
            }
        }

        // 4. Update Payment Record
        const updateData: any = {
            amount: newAmount,
            notes: (payment.notes ? payment.notes + " | " : "") + `Editado: $${oldAmount} -> $${newAmount}. Razón: ${reason}`
        };

        if (newMethod) updateData.method = newMethod;
        if (newAccountId) updateData.accountId = newAccountId;

        await tx.payment.update({
            where: { id: paymentId },
            data: updateData
        });

        // 5. Update Sale (only if amount changed)
        if (amountChanged) {
            const currentPaid = payment.sale.amountPaid.toNumber();
            const delta = newAmount - oldAmount;
            const newPaid = currentPaid + delta;
            await tx.sale.update({
                where: { id: payment.saleId },
                data: {
                    amountPaid: newPaid
                }
            });
        }
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
