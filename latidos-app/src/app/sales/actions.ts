"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Customer Actions ---

export async function searchCustomers(term: string) {
    if (!term) return [];

    return await prisma.customer.findMany({
        where: {
            OR: [
                { name: { contains: term } },
                { taxId: { contains: term } }
            ]
        },
        take: 5
    });
}

export async function createCustomer(data: { name: string; taxId: string; phone?: string; email?: string; address?: string }) {
    if (!data.name || !data.taxId) {
        throw new Error("Nombre y Documento (NIT/CC) requeridos.");
    }

    if (data.email && !data.email.includes("@")) {
        throw new Error("Formato de email inválido.");
    }

    try {
        const customer = await prisma.customer.create({
            data: {
                name: data.name,
                taxId: data.taxId,
                phone: data.phone,
                email: data.email,
                address: data.address
            }
        });
        return customer;
    } catch (e: any) {
        if (e.code === 'P2002') {
            throw new Error("Ya existe un cliente con este documento.");
        }
        throw new Error(e.message);
    }
}

// --- Product/Scanner Actions ---

export async function getInstanceBySerial(serial: string) {
    // We strictly check for IN_STOCK status
    const instance = await prisma.instance.findUnique({
        where: { serialNumber: serial },
        include: { product: true }
    });

    if (!instance) {
        throw new Error("Serial no encontrado.");
    }

    if (instance.status !== "IN_STOCK") {
        throw new Error(`El producto no está disponible (Estado: ${instance.status})`);
    }

    return instance;
}

// --- Sale Transaction ---

export async function processSale(data: { customerId: string; items: string[]; total: number; paymentMethod: string }) {
    if (!data.customerId) throw new Error("Cliente requerido.");
    if (data.items.length === 0) throw new Error("No hay productos en el carrito.");

    // Transaction: Create Sale -> Update Instances
    const sale = await prisma.$transaction(async (tx) => {
        // 1. Create Sale Header
        const newSale = await tx.sale.create({
            data: {
                customerId: data.customerId,
                total: data.total,
                paymentMethod: data.paymentMethod,
                date: new Date()
            }
        });

        // 2. Update Instances (Link to Sale + Change Status)
        for (const serial of data.items) {
            // Re-check status inside transaction for concurrency safety
            const instance = await tx.instance.findUnique({ where: { serialNumber: serial } });
            if (!instance || instance.status !== "IN_STOCK") {
                throw new Error(`El serial ${serial} ya no está disponible.`);
            }

            await tx.instance.update({
                where: { serialNumber: serial },
                data: {
                    status: "SOLD",
                    saleId: newSale.id
                }
            });
        }

        return newSale;
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    return sale;
}

// --- Catalog Actions ---

export async function getAvailableProducts() {
    // Fetch all products that have at least one IN_STOCK instance
    const products = await prisma.product.findMany({
        where: {
            instances: {
                some: {
                    status: "IN_STOCK"
                }
            }
        },
        include: {
            // value: true // Aggregation in Prisma is tricky with include, so we might need a separate count or just fetch instances
            instances: {
                where: {
                    status: "IN_STOCK"
                },
                select: {
                    id: true // Minimal selection for count
                }
            }
        }
    });

    // Map to include a simple count and serialize Decimal
    return products.map(p => ({
        ...p,
        basePrice: p.basePrice.toNumber(),
        stockCount: p.instances.length,
        instances: undefined // Remove the array to save bandwidth
    }));
}

export async function getAvailableInstances(productId: string) {
    return await prisma.instance.findMany({
        where: {
            productId: productId,
            status: "IN_STOCK"
        },
        select: {
            id: true,
            serialNumber: true,
            condition: true,
            location: true
        }
    });
}
