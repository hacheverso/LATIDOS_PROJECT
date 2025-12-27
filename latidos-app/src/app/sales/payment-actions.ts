"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerPayment(data: {
    saleId: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
}) {
    if (data.amount <= 0) throw new Error("El monto debe ser mayor a 0.");

    const payment = await prisma.$transaction(async (tx) => {
        // 1. Create Payment
        const newPayment = await tx.payment.create({
            data: {
                saleId: data.saleId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                notes: data.notes,
                date: new Date()
            }
        });

        // 2. Update Sale amountPaid cache
        // Fetch current paid
        const sale = await tx.sale.findUnique({
            where: { id: data.saleId },
            select: { amountPaid: true, total: true }
        });

        if (!sale) throw new Error("Venta no encontrada.");

        const currentPaid = sale.amountPaid.toNumber();
        const newPaid = currentPaid + data.amount;

        // Optional: Block overpayment?
        // if (newPaid > sale.total.toNumber()) throw new Error("El monto excede la deuda.");

        await tx.sale.update({
            where: { id: data.saleId },
            data: { amountPaid: newPaid }
        });

        return newPayment;
    });

    revalidatePath(`/sales/${data.saleId}`);
    revalidatePath("/sales");

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
