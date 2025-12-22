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
    } catch (e: unknown) {
        if ((e as { code?: string }).code === 'P2002') {
            throw new Error("Ya existe un cliente con este documento.");
        }
        throw new Error((e as Error).message);
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

export async function processSale(data: {
    customerId: string;
    items: { productId: string; quantity: number; serial?: string }[];
    total: number;
    amountPaid?: number;
    paymentMethod: string;
}) {
    if (!data.customerId) throw new Error("Cliente requerido.");
    if (data.items.length === 0) throw new Error("No hay productos en el carrito.");

    // Transaction: Create Sale -> Update Instances
    const sale = await prisma.$transaction(async (tx) => {
        // 1. Create Sale Header
        const newSale = await tx.sale.create({
            data: {
                customerId: data.customerId,
                total: data.total,
                amountPaid: data.amountPaid ?? data.total,
                paymentMethod: data.paymentMethod,
                date: new Date()
            }
        });

        // 2. Update Instances (Link to Sale + Change Status)
        for (const item of data.items) {
            // Case A: Specific Serial
            if (item.serial) {
                const instance = await tx.instance.findUnique({ where: { serialNumber: item.serial } });
                if (!instance || instance.status !== "IN_STOCK") {
                    throw new Error(`El serial ${item.serial} ya no está disponible.`);
                }
                await tx.instance.update({
                    where: { serialNumber: item.serial },
                    data: { status: "SOLD", saleId: newSale.id }
                });
            }
            // Case B: General Stock (Quantity based)
            else {
                // Find N instances of this product with N/A serial or just any available?
                // Rule: Try to find 'N/A' first. If strict mode, maybe only N/A.
                // For now, let's look for instances where serialNumber is NULL or "N/A"
                // Actually, our data might have various formats. Let's assume we look for "IN_STOCK" for that product
                // prioritized by those with "N/A" serials to avoid accidentally selling a real serial as generic?
                // Refined Logic based on request: "Group all items with 'Serial: N/A'".
                // So we should strictly sell instances that preserve this logic or just grab any available if we don't care.
                // The prompt says "descontar automáticamente las unidades del 'Stock General' (N/A)".

                const availableGenerics = await tx.instance.findMany({
                    where: {
                        productId: item.productId,
                        status: "IN_STOCK",
                        OR: [
                            { serialNumber: "N/A" },
                            { serialNumber: null }
                        ]
                    },
                    take: item.quantity
                });

                if (availableGenerics.length < item.quantity) {
                    // Fallback? Or Error?
                    // If we are selling "General Stock", we expect "N/A" items.
                    // If the user wants to sell a specific one without scanning, that's ambiguous.
                    // Let's strict fail if we can't find enough "N/A" items, compelling the user to pick a serial if only unique ones exist.
                    throw new Error(`No hay suficiente stock general (N/A) para el producto ${item.productId}. Disponibles: ${availableGenerics.length}`);
                }

                for (const genericInstance of availableGenerics) {
                    await tx.instance.update({
                        where: { id: genericInstance.id },
                        data: { status: "SOLD", saleId: newSale.id }
                    });
                }
            }
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
                    id: true,
                    serialNumber: true // We need serialNumber to distiguish General from Unique
                }
            }
        }
    });

    // Map to include a simple count and serialize Decimal
    return products.map(p => {
        const generalStock = p.instances.filter(i => i.serialNumber === "N/A" || i.serialNumber === null).length;
        const uniqueStock = p.instances.length - generalStock;

        return {
            ...p,
            basePrice: p.basePrice.toNumber(),
            stockCount: p.instances.length,
            generalStock,
            uniqueStock,
            instances: undefined // Remove the array to save bandwidth
        };
    });
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

// --- History Actions ---

export async function getSales() {
    const sales = await prisma.sale.findMany({
        include: {
            customer: true,
            _count: {
                select: { instances: true }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    // Serialize Decimal and Date for Client Components
    return sales.map(s => {
        const total = s.total.toNumber();
        const amountPaid = s.amountPaid?.toNumber() || 0;
        const balance = total - amountPaid;

        return {
            ...s,
            total,
            amountPaid,
            balance,
            status: balance <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING',
            date: s.date.toISOString(),
            itemCount: s._count.instances,
            customer: {
                ...s.customer,
                createdAt: s.customer.createdAt.toISOString(),
                updatedAt: s.customer.updatedAt.toISOString()
            }
        };
    });
}
