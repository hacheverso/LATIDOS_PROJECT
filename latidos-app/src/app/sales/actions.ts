"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { compare } from "bcryptjs";

// --- Security ---

// Helper to verify PIN (Now secure)
// Helper to verify PIN (Now secure and exported for UI)
export async function verifyPin(pin: string) {
    if (!pin) return null;

    // Scan all users to find one that matches the PIN
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, securityPin: true } });

    for (const u of users) {
        if (u.securityPin && await compare(pin, u.securityPin)) {
            return { id: u.id, name: u.name, role: u.role }; // Return the full user object (id, name, role)
        }
    }
    return null;
}

// --- Sales Intelligence ---

export async function getSalesIntelligenceMetrics() {
    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    // 1. Fetch all sales for calculation (Optimization: Could use groupBy if Prisma supports it fully for what we need, but we need relations)
    // For now, fetching simplified data is safer for complex logic.
    const allSales = await prisma.sale.findMany({
        include: { customer: true },
        where: { amountPaid: { gt: 0 } } // Consider only active customers? Or all? Let's take all who bought.
    });

    // Also fetch ALL pending sales to check for overdue debt globally for scoring
    const pendingSales = await prisma.sale.findMany({
        where: {
            amountPaid: { equals: 0 }, // Or balance > 0
            date: { lt: fifteenDaysAgo }
        },
        select: { customerId: true }
    });
    const overdueCustomerIds = new Set(pendingSales.map(s => s.customerId));

    // 2. Calculate Top Customers & Scores
    const customerMap = new Map<string, { id: string, name: string, totalBought: number, transactionCount: number }>();
    let totalRevenue = 0;
    let totalTransactions = 0;

    // We need logic for ALL sales (to get total revenue correctly) not just paid ones if Average Ticket counts billed amount
    const globalSales = await prisma.sale.findMany({ include: { customer: true } }); // Re-fetch or reuse? Reuse logic better.

    for (const sale of globalSales) {
        totalRevenue += Number(sale.total);
        totalTransactions++;

        if (!customerMap.has(sale.customerId)) {
            customerMap.set(sale.customerId, {
                id: sale.customerId,
                name: sale.customer.name,
                totalBought: 0,
                transactionCount: 0
            });
        }
        const c = customerMap.get(sale.customerId)!;
        c.totalBought += Number(sale.total);
        c.transactionCount++;
    }

    const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalBought - a.totalBought)
        .slice(0, 5)
        .map(c => {
            // Scoring Logic
            let stars = 1;
            if (c.totalBought > 10_000_000) stars = 5;
            else if (c.totalBought > 1_000_000) stars = 3;
            else stars = 1;

            // Penalty
            if (overdueCustomerIds.has(c.id)) {
                stars = Math.max(1, stars - 2);
            }

            return { ...c, score: stars };
        });

    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
        averageTicket,
        topCustomers,
        totalRevenue
    };
}

export async function getSales(filters?: { startDate?: Date, endDate?: Date, status?: string, search?: string }) {
    const whereClause: any = {};

    if (filters?.startDate || filters?.endDate) {
        whereClause.date = {};
        if (filters.startDate) whereClause.date.gte = filters.startDate;
        if (filters.endDate) whereClause.date.lte = filters.endDate;
    }

    if (filters?.search) {
        const term = filters.search;
        whereClause.OR = [
            { customer: { name: { contains: term, mode: 'insensitive' } } },
            { customer: { taxId: { contains: term } } },
            { invoiceNumber: { contains: term, mode: 'insensitive' } },
            // Deep Search in Instances (Products)
            {
                instances: {
                    some: {
                        OR: [
                            { serialNumber: { contains: term, mode: 'insensitive' } },
                            { imei: { contains: term, mode: 'insensitive' } },
                            {
                                product: {
                                    OR: [
                                        { name: { contains: term, mode: 'insensitive' } },
                                        { sku: { contains: term, mode: 'insensitive' } },
                                        { upc: { contains: term, mode: 'insensitive' } }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        ];
    }

    const dbSales = await prisma.sale.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        include: {
            customer: true,
            instances: true // Include for item counts
        }
    });

    return dbSales.map(sale => ({
        ...sale,
        total: Number(sale.total),
        amountPaid: Number(sale.amountPaid),
        balance: Number(sale.total) - Number(sale.amountPaid),
        itemCount: sale.instances.length,
        status: (Number(sale.total) - Number(sale.amountPaid)) <= 0 ? 'PAID' : (Number(sale.amountPaid) > 0 ? 'PARTIAL' : 'PENDING')
    }));
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
    items: { productId: string; quantity: number; serials?: string[], price?: number }[];
    total: number;
    amountPaid?: number;
    paymentMethod: string;
    notes?: string;
}) {
    if (!data.customerId) throw new Error("Cliente requerido.");
    if (data.items.length === 0) throw new Error("No hay productos en el carrito.");

    const sale = await prisma.$transaction(async (tx) => {
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

        // Recalculate total server-side to prevent client-side errors/tampering
        const calculatedTotal = data.items.reduce((acc, item) => {
            const price = item.price || 0;
            return acc + (price * item.quantity);
        }, 0);

        const newSale = await tx.sale.create({
            data: {
                customerId: data.customerId,
                total: calculatedTotal,
                amountPaid: 0, // Force PENDING state
                paymentMethod: data.paymentMethod,
                date: now,
                invoiceNumber,
                notes: data.notes
            }
        });

        // REMOVED: Immediate payment creation.
        // Sales must start as PENDING (amountPaid = 0).
        // Payments should be added via the Collections module or a separate "Add Payment" action if needed immediately.

        for (const item of data.items) {
            if (item.serials && item.serials.length > 0) {
                for (const serial of item.serials) {
                    const instance = await tx.instance.findUnique({ where: { serialNumber: serial } });

                    if (instance) {
                        if (instance.status !== "IN_STOCK") {
                            throw new Error(`El serial ${serial} ya no está disponible (Estado: ${instance.status}).`);
                        }
                        await tx.instance.update({
                            where: { id: instance.id },
                            data: {
                                status: "SOLD",
                                saleId: newSale.id,
                                soldPrice: item.price ? item.price : undefined
                            }
                        });
                    } else {
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

                        await tx.instance.update({
                            where: { id: genericInstance.id },
                            data: {
                                serialNumber: serial,
                                status: "SOLD",
                                saleId: newSale.id,
                                soldPrice: item.price ? item.price : undefined
                            }
                        });
                    }
                }
            }
            else {
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
                    throw new Error(`No hay suficiente stock general disponible para el producto ${item.productId}. Requeridos: ${item.quantity}, Disponibles: ${availableGenerics.length}`);
                }

                await tx.instance.updateMany({
                    where: {
                        id: { in: availableGenerics.map(i => i.id) }
                    },
                    data: {
                        status: "SOLD",
                        saleId: newSale.id,
                        soldPrice: item.price ? item.price : undefined
                    }
                });
            }
        }

        return newSale;
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    return sale;
}

export async function deleteSale(saleId: string) {
    if (!saleId) throw new Error("ID de venta requerido.");

    // Transaction: Revert Stock & Delete Sale
    await prisma.$transaction(async (tx) => {
        // 1. Validate Sale existence
        const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: { instances: true }
        });

        if (!sale) throw new Error("Venta no encontrada.");

        // 2. Revert Stock
        // Find all instances associated with this sale
        const soldInstances = await tx.instance.findMany({
            where: { saleId: saleId }
        });

        if (soldInstances.length > 0) {
            // Updated them back to IN_STOCK
            await tx.instance.updateMany({
                where: { saleId: saleId },
                data: {
                    status: "IN_STOCK",
                    saleId: null,
                    soldPrice: null,
                    updatedAt: new Date()
                }
            });
        }

        // 3. Delete Sale
        // Cascade delete should handle saleItems if any table exists, but currently we link instances directly.
        await tx.sale.delete({
            where: { id: saleId }
        });
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    return { success: true };
}

// --- Catalog Actions ---

export async function getCategories() {
    return await prisma.category.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getAvailableProducts() {
    const products = await prisma.product.findMany({
        where: {
            instances: {
                some: {
                    status: "IN_STOCK"
                }
            }
        },
        include: {
            categoryRel: true,
            instances: {
                where: {
                    status: "IN_STOCK"
                },
                select: {
                    id: true,
                    serialNumber: true,
                    cost: true
                }
            }
        }
    });

    return products.map(p => {
        const generalStock = p.instances.filter(i => i.serialNumber === "N/A" || i.serialNumber === null).length;
        const uniqueStock = p.instances.length - generalStock;

        const totalCost = p.instances.reduce((acc, curr) => acc + (curr.cost ? curr.cost.toNumber() : 0), 0);
        const avgCost = p.instances.length > 0 ? totalCost / p.instances.length : 0;

        return {
            ...p,
            categoryRel: p.categoryRel ? { id: p.categoryRel.id, name: p.categoryRel.name } : undefined,
            categoryName: p.categoryRel?.name || p.category || "Sin Categoría",
            basePrice: p.basePrice.toNumber(),
            estimatedCost: avgCost,
            stockCount: p.instances.length,
            generalStock,
            uniqueStock,
            instances: undefined
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

export async function getSaleById(id: string) {
    const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
            customer: true,
            instances: {
                include: { product: true }
            }
        }
    });

    if (!sale) return null;

    return {
        ...sale,
        total: sale.total.toNumber(),
        amountPaid: sale.amountPaid?.toNumber() || 0,
        instances: sale.instances.map(i => ({
            ...i,
            cost: i.cost?.toNumber() || 0,
            soldPrice: i.soldPrice?.toNumber() || 0,
            originalCost: i.originalCost?.toNumber() || 0,
            createdAt: i.createdAt.toISOString(),
            updatedAt: i.updatedAt.toISOString(),
            product: {
                ...i.product,
                basePrice: i.product.basePrice.toNumber(),
                createdAt: i.product.createdAt.toISOString(),
                updatedAt: i.product.updatedAt.toISOString()
            }
        })),
        customer: {
            ...sale.customer,
            createdAt: sale.customer.createdAt.toISOString(),
            updatedAt: sale.customer.updatedAt.toISOString()
        }
    };
}



// --- Collections & Blocking Logic ---

export async function checkCustomerStatus(customerId: string) {
    if (!customerId) return { blocked: false };

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const overdueSales = await prisma.sale.findMany({
        where: {
            customerId: customerId,
            date: { lt: fifteenDaysAgo },
        },
        select: {
            id: true,
            date: true,
            total: true,
            amountPaid: true,
            invoiceNumber: true
        }
    });

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

// --- Sales Update & Audit (Secure) ---

type SaleUpdateInput = {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    amountPaid?: number;
};

export async function updateSale(saleId: string, data: SaleUpdateInput, auth: { pin: string, reason: string }) {
    if (!saleId) throw new Error("ID de venta requerido");

    // 0. Verify Security
    const authorizedUser = await verifyPin(auth.pin); // empty userId means "search by pin"
    if (!authorizedUser) {
        throw new Error("PIN de seguridad inválido o no autorizado.");
    }

    const { userId, userName } = { userId: authorizedUser.id, userName: authorizedUser.name };

    // Transactional Update
    return await prisma.$transaction(async (tx) => {
        // 1. Fetch Current Sale State
        const currentSale = await tx.sale.findUnique({
            where: { id: saleId },
            include: {
                instances: {
                    include: { product: true }
                }
            }
        });

        if (!currentSale) throw new Error("Venta no encontrada");

        // 2. Diff Calculation (Audit)
        const oldInstances = currentSale.instances;
        const oldTotal = Number(currentSale.total);
        let calculatedTotal = 0;
        const itemChanges: any[] = [];

        // Helper to group instances by productId
        const groupInstances = (insts: any[]) => {
            const map = new Map();
            insts.forEach(i => {
                if (!map.has(i.productId)) {
                    map.set(i.productId, {
                        productId: i.productId,
                        // @ts-ignore
                        productName: i.product?.name || "Producto",
                        quantity: 0,
                        price: Number(i.soldPrice || 0)
                    });
                }
                map.get(i.productId).quantity++;
            });
            return map;
        };

        // @ts-ignore
        const oldMap = groupInstances(oldInstances);

        // 3. Process Items & Calculate Total
        for (const item of data.items) {
            calculatedTotal += (item.quantity * item.price);

            // Audit Diff Logic
            const oldItem = oldMap.get(item.productId);
            if (oldItem) {
                // Exists in old, check for changes
                if (oldItem.quantity !== item.quantity || oldItem.price !== item.price) {
                    itemChanges.push({
                        type: 'modified',
                        productName: oldItem.productName,
                        oldQty: oldItem.quantity,
                        newQty: item.quantity,
                        oldPrice: oldItem.price,
                        newPrice: item.price
                    });
                }
                oldMap.delete(item.productId); // Mark as processed
            } else {
                // New Item - Fetch product details
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true }
                });

                itemChanges.push({
                    type: 'added',
                    productName: product?.name || "Producto (Nuevo)",
                    oldQty: 0,
                    newQty: item.quantity,
                    oldPrice: 0,
                    newPrice: item.price
                });
            }

            // ... Existing Stock Logic ...
            const currentInstances = currentSale.instances.filter(i => i.productId === item.productId);
            const currentQty = currentInstances.length;

            if (item.quantity === currentQty) {
                // No Qty Change -> Just update prices
                await tx.instance.updateMany({
                    where: { id: { in: currentInstances.map(i => i.id) } },
                    data: { soldPrice: item.price }
                });
            } else if (item.quantity < currentQty) {
                // Remove some
                const removeCount = currentQty - item.quantity;
                const instancesToRemove = currentInstances.slice(0, removeCount);
                const instancesToKeep = currentInstances.slice(removeCount);

                await tx.instance.updateMany({
                    where: { id: { in: instancesToRemove.map(i => i.id) } },
                    data: { status: "IN_STOCK", saleId: null, soldPrice: null }
                });

                if (instancesToKeep.length > 0) {
                    await tx.instance.updateMany({
                        where: { id: { in: instancesToKeep.map(i => i.id) } },
                        data: { soldPrice: item.price }
                    });
                }
            } else {
                // Add some
                await tx.instance.updateMany({
                    where: { id: { in: currentInstances.map(i => i.id) } },
                    data: { soldPrice: item.price }
                });

                const addCount = item.quantity - currentQty;
                const availableGenerics = await tx.instance.findMany({
                    where: {
                        productId: item.productId,
                        status: "IN_STOCK",
                        OR: [{ serialNumber: "N/A" }, { serialNumber: null }]
                    },
                    take: addCount
                });

                if (availableGenerics.length < addCount) {
                    throw new Error(`Stock insuficiente para producto ${item.productId}. Req: ${addCount}, Disp: ${availableGenerics.length}`);
                }

                await tx.instance.updateMany({
                    where: { id: { in: availableGenerics.map(i => i.id) } },
                    data: { status: "SOLD", saleId: saleId, soldPrice: item.price }
                });
            }
        }

        // Process Removed Items (remaining in oldMap)
        oldMap.forEach((oldItem: any) => {
            itemChanges.push({
                type: 'removed',
                productName: oldItem.productName,
                oldQty: oldItem.quantity,
                newQty: 0,
                oldPrice: oldItem.price,
                newPrice: 0
            });
        });

        // Fix: Release items completely removed from the list
        const newProductIds = new Set(data.items.map(i => i.productId));
        const instancesToReleaseCompletely = currentSale.instances.filter(i => !newProductIds.has(i.productId));

        if (instancesToReleaseCompletely.length > 0) {
            await tx.instance.updateMany({
                where: { id: { in: instancesToReleaseCompletely.map(i => i.id) } },
                data: { status: "IN_STOCK", saleId: null, soldPrice: null }
            });
        }

        // 4. Update Sale Header
        await tx.sale.update({
            where: { id: saleId },
            data: {
                customerId: data.customerId,
                total: calculatedTotal,
                amountPaid: data.amountPaid !== undefined ? data.amountPaid : currentSale.amountPaid,
                lastModifiedBy: userName,
                modificationReason: auth.reason,
                // Create Audit Log
                audits: {
                    create: {
                        userId: userId,
                        userName: userName, // Snapshot
                        reason: auth.reason,
                        changes: JSON.stringify({
                            oldTotal,
                            newTotal: calculatedTotal,
                            itemChanges
                        })
                    }
                }
            }
        });
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
}
