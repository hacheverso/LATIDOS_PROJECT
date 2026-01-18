"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { compare } from "bcryptjs";
import { auth } from "@/auth";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

// --- Security ---

// Helper to verify PIN (Now secure and exported for UI)
// Helper to verify PIN (Now secure and exported for UI)
// Helper to verify PIN (Now secure and exported for UI)
export async function verifyPin(pin: string) {
    if (!pin) return null;
    const orgId = await getOrgId();

    try {
        // 1. Check Users (Admins usually)
        const users = await prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true, role: true, securityPin: true, staffPin: true }
        });

        for (const u of users) {
            // @ts-ignore
            const matchesSecurity = u.securityPin && await compare(pin, u.securityPin);
            // @ts-ignore
            const matchesStaff = u.staffPin && await compare(pin, u.staffPin);

            if (matchesSecurity || matchesStaff) {
                // Update last usage
                await prisma.user.update({
                    where: { id: u.id },
                    data: { lastActionAt: new Date() }
                }).catch(err => console.error("Failed to update lastActionAt", err));

                return { id: u.id, name: u.name, role: u.role };
            }
        }

        // 2. Check Operators (Dual ID)
        const operators = await prisma.operator.findMany({
            where: { organizationId: orgId, isActive: true }
        });

        for (const op of operators) {
            const isMatch = await compare(pin, op.securityPin);
            if (isMatch) {
                // Determine 'effective' role. Operators are trusted for operations if they have a code.
                // We return a special role or map them to a permission set?
                // For now, we return 'OPERATOR'. The consumer (Modal) must decide if 'OPERATOR' is enough.
                return { id: op.id, name: op.name, role: "OPERATOR" };
            }
        }

        return null;
    } catch (error) {
        throw new Error("Error interno al verificar PIN. Revise conexión a DB.");
    }
}

// Middleware for Server Actions requiring Staff Logic
export async function withStaffAuth(pin: string, callback: (user: { id: string, name: string, role: string }) => Promise<any>) {
    const user = await verifyPin(pin);
    if (!user) throw new Error("PIN de autorización inválido o usuario no encontrado.");
    return await callback(user);
}

// --- Sales Intelligence ---

export async function getSalesIntelligenceMetrics() {
    const orgId = await getOrgId();
    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const pendingSales = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            amountPaid: { equals: 0 },
            date: { lt: fifteenDaysAgo }
        },
        select: { customerId: true }
    });
    const overdueCustomerIds = new Set(pendingSales.map(s => s.customerId));

    const customerMap = new Map<string, { id: string, name: string, totalBought: number, transactionCount: number }>();
    let totalRevenue = 0;
    let totalTransactions = 0;

    const globalSales = await prisma.sale.findMany({
        where: { organizationId: orgId },
        include: { customer: true }
    });

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
            let stars = 1;
            if (c.totalBought > 10_000_000) stars = 5;
            else if (c.totalBought > 1_000_000) stars = 3;
            else stars = 1;

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
    const orgId = await getOrgId();
    const whereClause: any = { organizationId: orgId };

    if (filters?.startDate || filters?.endDate) {
        whereClause.date = {};
        if (filters.startDate) whereClause.date.gte = filters.startDate;
        if (filters.endDate) whereClause.date.lte = filters.endDate;
    }

    if (filters?.search) {
        const term = filters.search.trim();

        whereClause.OR = [
            { customer: { name: { contains: term, mode: 'insensitive' } } },
            { customer: { taxId: { contains: term, mode: 'insensitive' } } },
            { invoiceNumber: { contains: term, mode: 'insensitive' } },
            { id: { contains: term, mode: 'insensitive' } },
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
            instances: {
                include: { product: true }
            }
        }
    });

    const formattedSales = dbSales.map(sale => {
        const total = Number(sale.total);
        const paid = Number(sale.amountPaid);
        const balance = total - paid;
        const now = new Date();

        let status = 'PENDING';
        if (balance <= 100) status = 'PAID';
        else if (sale.dueDate && now > sale.dueDate) status = 'OVERDUE';
        else if (paid > 0) status = 'PARTIAL';

        return {
            ...sale,
            total,
            amountPaid: paid,
            balance,
            itemCount: sale.instances.length,
            status,
            customerName: sale.customer.name,
            customerTaxId: sale.customer.taxId
        };
    });

    if (filters?.status && filters.status !== 'ALL') {
        if (filters.status === 'PAID') {
            return formattedSales.filter(s => s.status === 'PAID');
        } else if (filters.status === 'PENDING_DEBT') {
            return formattedSales.filter(s => s.status === 'PENDING' || s.status === 'PARTIAL' || s.status === 'OVERDUE');
        } else if (filters.status === 'OVERDUE') {
            return formattedSales.filter(s => s.status === 'OVERDUE');
        } else {
            return formattedSales.filter(s => s.status === filters.status);
        }
    }

    return formattedSales;
}


// --- Customer CRM ---

export async function getCustomersWithMetrics() {
    const orgId = await getOrgId();
    const customers = await prisma.customer.findMany({
        where: { organizationId: orgId },
        include: {
            sales: {
                select: { total: true, date: true, amountPaid: true, dueDate: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const enrichedCustomers = customers.map(c => {
        const totalBought = c.sales.reduce((acc, sale) => acc + Number(sale.total), 0);
        const transactionCount = c.sales.length;
        const purchasesLast30Days = c.sales.filter(s => new Date(s.date) >= thirtyDaysAgo).length;

        const lastPurchaseDate = c.sales.length > 0 ? c.sales[0].date : null;

        // Debt Calculation
        const totalDebt = c.sales.reduce((acc, sale) => {
            const balance = Number(sale.total) - Number(sale.amountPaid);
            return acc + (balance > 0 ? balance : 0);
        }, 0);

        const overdueDebt = c.sales.reduce((acc, sale) => {
            const balance = Number(sale.total) - Number(sale.amountPaid);
            if (balance <= 0) return acc;

            // Check if overdue
            // default 30 days if no due date, but usually dueDate should be set.
            const due = sale.dueDate ? new Date(sale.dueDate) : new Date(sale.date.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (due < now) return acc + balance;
            return acc;
        }, 0);


        let stars = 1;
        if (totalBought > 10_000_000) stars = 5;
        else if (totalBought > 5_000_000) stars = 4;
        else if (totalBought > 1_000_000) stars = 3;
        else if (totalBought > 0) stars = 2;

        return {
            ...c,
            totalBought,
            transactionCount,
            lastPurchaseDate,
            purchasesLast30Days,
            totalDebt,
            overdueDebt,
            stars
        };
    });

    const totalRegistered = enrichedCustomers.length;
    const sortedByVolume = [...enrichedCustomers].sort((a, b) => b.totalBought - a.totalBought);
    const topClient = sortedByVolume.length > 0 ? sortedByVolume[0] : null;

    const overallTotal = enrichedCustomers.reduce((acc, c) => acc + c.totalBought, 0);
    const overallTransactions = enrichedCustomers.reduce((acc, c) => acc + c.transactionCount, 0);
    const averageTicket = overallTransactions > 0 ? overallTotal / overallTransactions : 0;

    // --- Metrics: Cobertura (Coverage) Logic ---
    const logisticZoneCount = await prisma.logisticZone.count({
        where: { organizationId: orgId }
    });

    // Get unique sectors from customers
    // Since Prisma wrapper doesn't support distinct on non-unique fields easily with where clause in all versions or mocking,
    // we can calculate it from the fetched list since we already fetched ALL customers for this org.
    const uniqueSectors = new Set(enrichedCustomers.map(c => c.sector).filter(Boolean));
    const coveredSectorsCount = uniqueSectors.size;

    let coverageLabel = "Global";
    let coverageValue = "100%";

    if (logisticZoneCount > 0) {
        const percentage = Math.round((coveredSectorsCount / logisticZoneCount) * 100);
        coverageLabel = `${coveredSectorsCount} / ${logisticZoneCount} Zonas`;
        coverageValue = `${percentage}%`;
    } else {
        // Fallback if no zones defined: Show main city or default
        // Could fetch organization profile city if available, for now static "Medellín" as requested
        coverageLabel = "Ciudad Principal";
        coverageValue = "Medellín";
    }

    return {
        customers: enrichedCustomers,
        metrics: {
            totalRegistered,
            topClientName: topClient?.name || "Sin Datos",
            topClientVal: topClient?.totalBought || 0,
            averageTicket,
            // New Metrics
            coverageLabel,
            coverageValue
        }
    };
}

export async function createCustomer(data: { name: string; companyName?: string; taxId: string; phone?: string; email?: string; address?: string, sector?: string }) {
    const orgId = await getOrgId();

    if (!data.name || !data.taxId) {
        throw new Error("Nombre y Documento (NIT/CC) requeridos.");
    }

    if (data.email && !data.email.includes("@")) {
        throw new Error("Formato de email inválido.");
    }

    try {
        if (data.sector) {
            const sectorName = data.sector.trim();
            if (sectorName) {
                const existing = await prisma.logisticZone.findFirst({
                    where: { name: sectorName, organizationId: orgId }
                });
                if (!existing) {
                    await prisma.logisticZone.create({
                        data: { name: sectorName, organizationId: orgId }
                    });
                }
            }
        }

        // VALIDATION: Check existing in THIS organization only
        const existing = await prisma.customer.findFirst({
            where: {
                organizationId: orgId,
                OR: [
                    { taxId: data.taxId },
                    { name: { equals: data.name, mode: 'insensitive' } }
                ]
            }
        });

        if (existing) {
            if (existing.taxId === data.taxId) throw new Error("Ya existe un cliente con este documento en tu organización.");
            // Optional: for name duplicates we could just warn, but user asked to check name too.
            // "WHERE (documentId = X OR name = Y)"
            throw new Error(`Ya existe un cliente con el nombre '${existing.name}' en tu organización.`);
        }

        const customer = await prisma.customer.create({
            data: {
                name: data.name,
                companyName: data.companyName,
                taxId: data.taxId,
                phone: data.phone,
                email: data.email,
                address: data.address,
                sector: data.sector,
                organizationId: orgId
            }
        });
        revalidatePath("/directory/customers");
        return customer;
    } catch (e: unknown) {
        if ((e as { code?: string }).code === 'P2002') {
            throw new Error("Ya existe un cliente con este documento en tu organización.");
        }
        throw new Error((e as Error).message);
    }
}

export async function updateCustomer(id: string, data: { name: string; companyName?: string; taxId: string; phone?: string; email?: string; address?: string, sector?: string }) {
    const orgId = await getOrgId();
    if (!id) throw new Error("ID de cliente requerido");

    try {
        if (data.sector) {
            const sectorName = data.sector.trim();
            if (sectorName) {
                const existing = await prisma.logisticZone.findFirst({
                    where: { name: sectorName, organizationId: orgId }
                });
                if (!existing) {
                    await prisma.logisticZone.create({
                        data: { name: sectorName, organizationId: orgId }
                    });
                }
            }
        }

        const belongsToOrg = await prisma.customer.findFirst({ where: { id, organizationId: orgId } });
        if (!belongsToOrg) throw new Error("Acceso denegado: Cliente de otra organización.");

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name: data.name,
                companyName: data.companyName,
                taxId: data.taxId,
                phone: data.phone,
                email: data.email,
                address: data.address,
                sector: data.sector
            }
        });
        revalidatePath("/directory/customers");
        revalidatePath("/sales");
        return customer;
    } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
            throw new Error("Ya existe un cliente con este documento.");
        }
        throw new Error("Error al actualizar cliente");
    }
}

// --- Product/Scanner Actions ---

export async function getInstanceBySerial(serial: string) {
    const orgId = await getOrgId();

    // 1. Prioritize IN_STOCK items belonging to ORG (Products are linked to Org)
    // Instance inherits Org from Product relation query
    let instance = await prisma.instance.findFirst({
        where: {
            serialNumber: serial,
            status: "IN_STOCK",
            product: { organizationId: orgId }
        },
        include: { product: true }
    });

    if (!instance) {
        // 2. Fallback: Check if it exists but is SOLD
        const soldInstance = await prisma.instance.findFirst({
            where: {
                serialNumber: serial,
                product: { organizationId: orgId }
            }
        });

        if (soldInstance) {
            throw new Error(`El serial ${serial} ya no está disponible (Estado: ${soldInstance.status})`);
        }

        throw new Error("Serial no encontrado.");
    }

    return {
        ...instance,
        cost: instance.cost ? instance.cost.toNumber() : 0,
        product: {
            ...instance.product,
            basePrice: instance.product.basePrice.toNumber(),
            estimatedCost: instance.cost ? instance.cost.toNumber() : 0
        }
    };
}

// --- Sale Transaction ---

import { verifyOperatorPin } from "../directory/team/actions";

// --- Helper: Get User Role ---
export async function getUserRole() {
    const session = await auth();
    // @ts-ignore
    return session?.user?.role || "GUEST";
}

export async function processSale(data: {
    customerId: string;
    items: { productId: string; quantity: number; serials?: string[], price?: number }[];
    total: number;
    amountPaid?: number;
    paymentMethod: string;
    deliveryMethod?: string;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    notes?: string;
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

    if (data.customerId.length === 0) throw new Error("Cliente requerido.");
    if (data.items.length === 0) throw new Error("No hay productos en el carrito.");

    // Validate Customer belongs to Org
    const validCustomer = await prisma.customer.findFirst({ where: { id: data.customerId, organizationId: orgId } });
    if (!validCustomer) throw new Error("Cliente inválido.");

    const sale = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const year = now.getFullYear();

        // 1. Get Next Sequence ID for Sales (Scoped to Org)
        const sequence = await tx.sequence.upsert({
            where: {
                type_year_organizationId: { // Use the new composite unique key
                    type: "SALE",
                    year: year,
                    organizationId: orgId
                }
            },
            update: {
                current: { increment: 1 }
            },
            create: {
                type: "SALE",
                year: year,
                current: 1,
                organizationId: orgId
            }
        });

        const shortYear = String(year).slice(-2);
        const seqStr = String(sequence.current).padStart(5, '0');
        const invoiceNumber = `H${shortYear}${seqStr}`;

        // Get Org Profile for settings
        const orgProfile = await tx.organizationProfile.findUnique({ where: { organizationId: orgId } });

        // 2. Create Sale Record
        const newSale = await tx.sale.create({
            data: {
                customerId: data.customerId,
                organizationId: orgId, // Bind to Org
                total: data.total,
                amountPaid: data.amountPaid ?? 0,
                paymentMethod: data.paymentMethod,
                deliveryMethod: data.deliveryMethod || "DELIVERY",
                deliveryStatus: (data.deliveryMethod === "PICKUP") ? "DELIVERED" : "PENDING",
                urgency: data.urgency || "MEDIUM",
                notes: data.notes,
                invoiceNumber: invoiceNumber,
                operatorId: data.operatorId, // Link Operator
                operatorName: operatorNameSnapshot, // Audit Snapshot
                dueDate: orgProfile?.defaultDueDays
                    ? new Date(now.getTime() + (orgProfile.defaultDueDays * 24 * 60 * 60 * 1000))
                    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                // @ts-ignore
                sellerId: session?.user?.email ? (await tx.user.findFirst({ where: { email: session.user.email, organizationId: orgId } }))?.id : undefined
            }
        });

        for (const item of data.items) {
            const product = await tx.product.findFirst({ where: { id: item.productId, organizationId: orgId } });
            if (!product) throw new Error(`Producto ${item.productId} no encontrado o no autorizado.`);

            if (item.serials && item.serials.length > 0) {
                for (const serial of item.serials) {
                    const instance = await tx.instance.findFirst({
                        where: {
                            serialNumber: serial,
                            status: "IN_STOCK",
                            productId: item.productId
                        }
                    });

                    if (instance) {
                        await tx.instance.update({
                            where: { id: instance.id },
                            data: {
                                status: "SOLD",
                                saleId: newSale.id,
                                soldPrice: item.price
                            }
                        });
                    } else {
                        // Look for generic stock
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
                                soldPrice: item.price
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
                    orderBy: { createdAt: 'asc' },
                    take: item.quantity
                });

                if (availableGenerics.length < item.quantity) {
                    throw new Error(`No hay suficiente stock general disponible para el producto ${product.name}.`);
                }

                await tx.instance.updateMany({
                    where: { id: { in: availableGenerics.map(i => i.id) } },
                    data: {
                        status: "SOLD",
                        saleId: newSale.id,
                        soldPrice: item.price
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
    const orgId = await getOrgId();

    await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({
            where: { id: saleId, organizationId: orgId },
            include: { instances: true }
        });

        if (!sale) throw new Error("Venta no encontrada o no autorizada.");

        const soldInstances = await tx.instance.findMany({
            where: { saleId: saleId }
        });

        if (soldInstances.length > 0) {
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

        await tx.saleAudit.deleteMany({
            where: { saleId: saleId }
        });

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
    const orgId = await getOrgId();
    return await prisma.category.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' }
    });
}

export async function getAvailableProducts() {
    const orgId = await getOrgId();
    const products = await prisma.product.findMany({
        where: {
            organizationId: orgId,
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
    const orgId = await getOrgId();
    // Validate product ownership first
    const product = await prisma.product.findFirst({ where: { id: productId, organizationId: orgId } });
    if (!product) return [];

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
    const orgId = await getOrgId();
    const sale = await prisma.sale.findFirst({
        where: { id, organizationId: orgId },
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

export async function checkCustomerStatus(customerId: string) {
    const orgId = await getOrgId();
    if (!customerId) return { blocked: false };

    // Explicit Org Check
    const valid = await prisma.customer.findFirst({ where: { id: customerId, organizationId: orgId } });
    if (!valid) return { blocked: false };

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const overdueSales = await prisma.sale.findMany({
        where: {
            customerId: customerId,
            organizationId: orgId,
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
    const orgId = await getOrgId();
    const sales = await prisma.sale.findMany({
        where: { organizationId: orgId },
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

type SaleUpdateInput = {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    amountPaid?: number;
};

export async function updateSale(saleId: string, data: SaleUpdateInput, auth: { pin: string, reason: string }) {
    if (!saleId) throw new Error("ID de venta requerido");
    const orgId = await getOrgId();

    const authorizedUser = await verifyPin(auth.pin);
    if (!authorizedUser) {
        throw new Error("PIN de seguridad inválido o no autorizado.");
    }

    const isOperator = authorizedUser.role === "OPERATOR";
    const userId = isOperator ? null : authorizedUser.id;
    const operatorId = isOperator ? authorizedUser.id : null;
    const userName = authorizedUser.name;

    return await prisma.$transaction(async (tx) => {
        const currentSale = await tx.sale.findFirst({
            where: { id: saleId, organizationId: orgId },
            include: {
                instances: {
                    include: { product: true }
                }
            }
        });

        if (!currentSale) throw new Error("Venta no encontrada o acceso denegado.");

        const oldInstances = currentSale.instances;
        const oldTotal = Number(currentSale.total);
        let calculatedTotal = 0;
        const itemChanges: any[] = [];

        const groupInstances = (insts: any[]) => {
            const map = new Map();
            insts.forEach(i => {
                if (!map.has(i.productId)) {
                    map.set(i.productId, {
                        productId: i.productId,
                        productName: i.product?.name || "Producto",
                        quantity: 0,
                        price: Number(i.soldPrice || 0)
                    });
                }
                map.get(i.productId).quantity++;
            });
            return map;
        };

        const oldMap = groupInstances(oldInstances);

        for (const item of data.items) {
            calculatedTotal += (item.quantity * item.price);

            const oldItem = oldMap.get(item.productId);
            if (oldItem) {
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
                oldMap.delete(item.productId);
            } else {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, organizationId: orgId },
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

            const currentInstances = currentSale.instances.filter(i => i.productId === item.productId);
            const currentQty = currentInstances.length;

            if (item.quantity === currentQty) {
                await tx.instance.updateMany({
                    where: { id: { in: currentInstances.map(i => i.id) } },
                    data: { soldPrice: item.price }
                });
            } else if (item.quantity < currentQty) {
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

        const newProductIds = new Set(data.items.map(i => i.productId));
        const instancesToReleaseCompletely = currentSale.instances.filter(i => !newProductIds.has(i.productId));

        if (instancesToReleaseCompletely.length > 0) {
            await tx.instance.updateMany({
                where: { id: { in: instancesToReleaseCompletely.map(i => i.id) } },
                data: { status: "IN_STOCK", saleId: null, soldPrice: null }
            });
        }

        await tx.sale.update({
            where: { id: saleId },
            data: {
                customerId: data.customerId,
                total: calculatedTotal,
                amountPaid: data.amountPaid !== undefined ? data.amountPaid : currentSale.amountPaid,
                lastModifiedBy: userName,
                modificationReason: auth.reason,
                audits: {
                    create: {
                        userId: userId,
                        operatorId: operatorId,
                        userName: userName,
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

export async function searchCustomers(term: string) {
    if (!term) return [];
    const orgId = await getOrgId();

    return await prisma.customer.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { taxId: { contains: term } },
                { sector: { contains: term, mode: 'insensitive' } }
            ]
        },
        take: 10,
        orderBy: { name: 'asc' }
    });
}

export async function bulkDeleteSales(saleIds: string[], pin: string) {
    if (!saleIds || saleIds.length === 0) throw new Error("No hay ventas seleccionadas.");
    const orgId = await getOrgId();

    const user = await verifyPin(pin);
    if (!user) throw new Error("PIN inválido o no autorizado.");

    if (user.role !== 'ADMIN') {
        throw new Error("Permisos insuficientes.");
    }

    try {
        await prisma.$transaction(async (tx) => {
            for (const id of saleIds) {
                // Ensure sale belongs to org
                const sale = await tx.sale.findFirst({ where: { id, organizationId: orgId } });
                if (!sale) continue; // Skip unauthorized/missing sales

                const soldInstances = await tx.instance.findMany({ where: { saleId: id } });
                if (soldInstances.length > 0) {
                    await tx.instance.updateMany({
                        where: { saleId: id },
                        data: {
                            status: "IN_STOCK",
                            saleId: null,
                            soldPrice: null,
                            updatedAt: new Date()
                        }
                    });
                }

                await tx.saleAudit.deleteMany({
                    where: { saleId: id }
                });

                await tx.sale.delete({ where: { id: id } });
            }
        });

        revalidatePath("/sales");
        revalidatePath("/dashboard");
        revalidatePath("/inventory");

        return { success: true, count: saleIds.length };
    } catch (error) {
        console.error("Bulk Delete Error:", error);
        throw new Error("Error al eliminar ventas: " + (error instanceof Error ? error.message : String(error)));
    }
}

export async function checkSerialOwnership(serial: string) {
    if (!serial) return null;
    const orgId = await getOrgId();

    const instance = await prisma.instance.findFirst({
        where: {
            serialNumber: serial,
            product: { organizationId: orgId } // Implicit Org Constraint via Product
        },
        include: { product: true }
    });

    if (!instance) return null;

    return {
        id: instance.id,
        productId: instance.productId,
        productName: instance.product.name,
        status: instance.status,
        currentSaleId: instance.saleId
    };
}

export async function getProductByUpcOrSku(term: string) {
    if (!term) return null;
    const orgId = await getOrgId();

    const product = await prisma.product.findFirst({
        where: {
            organizationId: orgId,
            OR: [
                { upc: { equals: term, mode: 'insensitive' } },
                { sku: { equals: term, mode: 'insensitive' } }
            ]
        },
        include: {
            instances: {
                where: { status: "IN_STOCK" }
            }
        }
    });

    if (!product) return null;

    const generalStock = product.instances.filter(i => i.serialNumber === "N/A" || i.serialNumber === null).length;
    const uniqueStock = product.instances.length - generalStock;

    return {
        ...product,
        basePrice: product.basePrice.toNumber(),
        generalStock,
        uniqueStock,
        requiresSerial: uniqueStock > 0 && generalStock === 0
    };
}
