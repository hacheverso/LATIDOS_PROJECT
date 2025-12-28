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
        // 1. Create Payment
        // @ts-ignore
        const newPayment = await tx.payment.create({
            data: {
                saleId: data.saleId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                notes: data.notes,
                date: new Date(),
                accountId: data.accountId
            } as any
        });

        // 2. Create Linked Transaction (Income)
        // Verify Account exists
        // @ts-ignore
        const account = await tx.paymentAccount.findUnique({ where: { id: data.accountId } });
        if (!account) throw new Error("Cuenta no encontrada");

        // @ts-ignore
        await tx.transaction.create({
            data: {
                amount: data.amount,
                type: "INCOME",
                description: `Abono Venta #${data.saleId.slice(0, 8)}`,
                category: "Ventas",
                accountId: data.accountId,
                paymentId: newPayment.id,
                userId: user.id,
                date: new Date()
            }
        });

        // 3. Update Account Balance
        // @ts-ignore
        await tx.paymentAccount.update({
            where: { id: data.accountId },
            data: { balance: { increment: data.amount } }
        });

        // 4. Update Sale amountPaid cache
        const sale = await tx.sale.findUnique({
            where: { id: data.saleId },
            select: { amountPaid: true, total: true, invoiceNumber: true }
        });

        if (!sale) throw new Error("Venta no encontrada.");

        const currentPaid = sale.amountPaid.toNumber();
        const newPaid = currentPaid + data.amount;

        await tx.sale.update({
            where: { id: data.saleId },
            data: { amountPaid: newPaid }
        });

        return newPayment;
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
    return {
        ...sale,
        total: sale.total.toNumber(),
        amountPaid: sale.amountPaid.toNumber(),
        balance: sale.total.toNumber() - sale.amountPaid.toNumber(),
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
