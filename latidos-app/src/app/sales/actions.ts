"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Customer Actions ---

export async function searchCustomers(term: string) {
    if (!term) return [];

    const customers = await prisma.customer.findMany({
        where: {
            OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { taxId: { contains: term } }
            ]
        },
        take: 5
    });
    console.log(`[Server] Searching '${term}' found ${customers.length} results`);
    return customers;
    console.log(`[Server] Searching '${term}' found ${customers.length} results`);
    return customers;
    console.log(`[Server] Searching '${term}' found ${customers.length} results`);
    return customers;
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
    items: { productId: string; quantity: number; serials?: string[] }[];
    total: number;
    amountPaid?: number;
    paymentMethod: string;
    notes?: string;
}) {
    if (!data.customerId) throw new Error("Cliente requerido.");
    if (data.items.length === 0) throw new Error("No hay productos en el carrito.");

    // Transaction: Create Sale -> Update Instances
    const sale = await prisma.$transaction(async (tx) => {
        // Calculate Invoice Number: YYYYMM###
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const count = await tx.sale.count({
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const invoiceNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(count + 1).padStart(3, '0')}`;

        // 1. Create Sale Header
        const newSale = await tx.sale.create({
            data: {
                customerId: data.customerId,
                total: data.total,
                amountPaid: Number(data.amountPaid ?? 0), // Default to 0 (Debt) if not explicitly paid roughly
                paymentMethod: data.paymentMethod,
                date: now,
                invoiceNumber,
                notes: data.notes
            }
        });

        // 1.1 If initial payment exists, create Payment record
        if (data.amountPaid && data.amountPaid > 0) {
            await tx.payment.create({
                data: {
                    saleId: newSale.id,
                    amount: Number(data.amountPaid),
                    method: data.paymentMethod,
                    date: new Date()
                }
            });
        }

        // 2. Update Instances (Link to Sale + Change Status)
        for (const item of data.items) {
            // Case A: Specific Serial
            if (item.serials && item.serials.length > 0) {
                for (const serial of item.serials) {
                    // Check if serial exists as a real instance
                    const instance = await tx.instance.findUnique({ where: { serialNumber: serial } });

                    if (instance) {
                        // Existing Valid Serial
                        if (instance.status !== "IN_STOCK") {
                            throw new Error(`El serial ${serial} ya no está disponible (Estado: ${instance.status}).`);
                        }
                        await tx.instance.update({
                            where: { id: instance.id },
                            data: { status: "SOLD", saleId: newSale.id }
                        });
                    } else {
                        // Manual / Virtual Serial -> Convert a General Stock Unit
                        const genericInstance = await tx.instance.findFirst({
                            where: {
                                productId: item.productId,
                                status: "IN_STOCK",
                                OR: [{ serialNumber: "N/A" }, { serialNumber: null }]
                            }
                        });

                        if (!genericInstance) {
                            throw new Error(`No hay stock general disponible para asignar el serial manual ${serial}.`);
                        }

                        // Convert General to Specific and Sell
                        await tx.instance.update({
                            where: { id: genericInstance.id },
                            data: {
                                serialNumber: serial,
                                status: "SOLD",
                                saleId: newSale.id
                            }
                        });
                    }
                }
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

export async function getCategories() {
    return await prisma.category.findMany({
        orderBy: { name: 'asc' }
    });
}

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
            categoryRel: true, // properties: id, name, slug
            instances: {
                where: {
                    status: "IN_STOCK"
                },
                select: {
                    id: true,
                    serialNumber: true, // We need serialNumber to distiguish General from Unique
                    cost: true // Needed for Privacy Margin calculation
                }
            }
        }
    });

    // Map to include a simple count and serialize Decimal
    return products.map(p => {
        const generalStock = p.instances.filter(i => i.serialNumber === "N/A" || i.serialNumber === null).length;
        const uniqueStock = p.instances.length - generalStock;

        // Calculate Average Cost for 'Privacy Margin' feature
        const totalCost = p.instances.reduce((acc, curr) => acc + (curr.cost ? curr.cost.toNumber() : 0), 0);
        const avgCost = p.instances.length > 0 ? totalCost / p.instances.length : 0;

        return {
            ...p,
            categoryRel: p.categoryRel ? { id: p.categoryRel.id, name: p.categoryRel.name } : undefined, // Sanitize relation
            categoryName: p.categoryRel?.name || p.category || "Sin Categoría", // Fallback to old string field if valid
            basePrice: p.basePrice.toNumber(),
            estimatedCost: avgCost, // New field for Frontend Margin Calc
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

// --- Collections & Blocking Logic ---

export async function checkCustomerStatus(customerId: string) {
    if (!customerId) return { blocked: false };

    // Find overdue sales (Red status: > 15 days old and unpaid)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const overdueSales = await prisma.sale.findMany({
        where: {
            customerId: customerId,
            date: { lt: fifteenDaysAgo },
            // We need to fetch sales that might be unpaid.
            // Since we don't store "balance" in DB for query, we fetch likely candidates.
            // Optimization: Fetch all sales for customer, compute in memory.
        },
        select: {
            id: true,
            date: true,
            total: true,
            amountPaid: true,
            invoiceNumber: true
        }
    });

    // Check balance for found sales
    const blockedSales = overdueSales.filter(s => {
        const balance = s.total.toNumber() - (s.amountPaid?.toNumber() || 0);
        return balance > 0;
    });

    if (blockedSales.length > 0) {
        return {
            blocked: true,
            reason: `CARTERA VENCIDA: ${blockedSales.length} facturas con más de 15 días en mora.`,
            oldestInvoice: blockedSales[0].invoiceNumber || blockedSales[0].id.slice(0, 8),
            daysOverdue: Math.floor((new Date().getTime() - blockedSales[0].date.getTime()) / (1000 * 3600 * 24))
        };
    }

    return { blocked: false };
}

export async function getCollectionsData() {
    const sales = await prisma.sale.findMany({
        include: { customer: true },
        orderBy: { date: 'asc' }
    });

    const pendingSales = sales.filter(s => {
        const balance = s.total.toNumber() - (s.amountPaid?.toNumber() || 0);
        return balance > 0;
    });

    // Classify
    const now = new Date();
    const result = pendingSales.map(s => {
        const balance = s.total.toNumber() - (s.amountPaid?.toNumber() || 0);
        const daysOld = Math.floor((now.getTime() - s.date.getTime()) / (1000 * 3600 * 24));

        let status: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN';
        if (daysOld >= 12 && daysOld <= 14) status = 'ORANGE';
        if (daysOld >= 15) status = 'RED';

        return {
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            customerName: s.customer.name,
            customerTaxId: s.customer.taxId,
            date: s.date,
            total: s.total.toNumber(),
            balance,
            daysOld,
            status
        };
    });

    return result;
}

