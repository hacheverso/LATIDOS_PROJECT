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
            where: { organizationId: orgId, isActive: true },
            include: { user: { select: { role: true } } }
        });

        for (const op of operators) {
            const isMatch = await compare(pin, op.securityPin);
            if (isMatch) {
                const effectiveRole = op.user?.role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
                return { id: op.id, name: op.name, role: effectiveRole };
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

export async function getSalesIntelligenceMetrics(filters?: { startDate?: Date, endDate?: Date }) {
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

    const whereClause: any = { organizationId: orgId };
    if (filters?.startDate) whereClause.date = { ...whereClause.date, gte: filters.startDate };
    if (filters?.endDate) whereClause.date = { ...whereClause.date, lte: filters.endDate };

    const globalSales = await prisma.sale.findMany({
        where: whereClause,
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

            return {
                ...c,
                score: stars,
                // These come from c which comes from customerMap which comes from sale.customerId (which is a string)
                // Wait, customerMap stores { id, name }. It does NOT store the whole customer object.
                // So topCustomers only has { id, name, totalBought, transactionCount, score }.
                // These are primitives. So getSalesIntelligenceMetrics IS SAFE.
                // However, I should double check if I need to do anything else.
                // Actually, let's look at getSales again to be sure I didn't miss anything.
            };
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

    const profile = await prisma.organizationProfile.findUnique({
        where: { organizationId: orgId }
    });
    const defaultDueDays = profile?.defaultDueDays || 15; // Fallback to 15 if not set

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
        const saleDate = new Date(sale.date);

        // Calculate days passed since creation
        const timeDiff = now.getTime() - saleDate.getTime();
        const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));

        let status = 'PENDING';

        if (balance <= 100) {
            status = 'PAID';
        } else {
            // If debt > 0
            if (daysPassed > defaultDueDays) {
                status = 'OVERDUE';
            } else {
                status = 'PENDING';
            }
        }

        return {
            ...sale,
            date: sale.date.toISOString(),
            dueDate: sale.dueDate ? sale.dueDate.toISOString() : null,
            total,
            amountPaid: paid,
            balance,
            itemCount: sale.instances.length,
            status,
            customerName: sale.customer.name,
            customerTaxId: sale.customer.taxId,
            createdAt: sale.createdAt.toISOString(),
            updatedAt: sale.updatedAt.toISOString(),
        };
    });

    if (filters?.status && filters.status !== 'ALL') {
        if (filters.status === 'PENDING_DEBT') {
            // "Por Cobrar" filter generally implies unpaid items (Pending or Overdue)
            return formattedSales.filter(s => s.status === 'PENDING' || s.status === 'OVERDUE');
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

        const lastPurchaseDate = c.sales.length > 0 ? c.sales[0].date.toISOString() : null;

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
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
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
                name: data.name.toUpperCase(),
                companyName: data.companyName ? data.companyName.toUpperCase() : null,
                taxId: data.taxId.toUpperCase(),
                phone: data.phone,
                email: data.email,
                address: data.address ? data.address.toUpperCase() : null,
                sector: data.sector ? data.sector.toUpperCase() : null,
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
                name: data.name.toUpperCase(),
                companyName: data.companyName ? data.companyName.toUpperCase() : null,
                taxId: data.taxId.toUpperCase(),
                phone: data.phone,
                email: data.email,
                address: data.address ? data.address.toUpperCase() : null,
                sector: data.sector ? data.sector.toUpperCase() : null
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

export async function bulkCreateCustomers(formData: FormData) {
    const orgId = await getOrgId();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha subido ningún archivo.");

    try {
        const text = await file.text();
        const rows = text.split("\n");
        const firstLine = rows[0]?.toLowerCase() || "";
        const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

        const errors: string[] = [];
        let processedCount = 0;

        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        const idxName = getIndex(["nombre", "name", "cliente", "razón"]);
        const idxCompany = getIndex(["empresa", "compañía", "company", "razon social"]);
        const idxTaxId = getIndex(["doc", "nit", "cc", "cédula", "identificación", "nif"]);
        const idxPhone = getIndex(["tel", "phone", "celular"]);
        const idxEmail = getIndex(["mail", "correo"]);
        const idxAddress = getIndex(["dirección", "direccion", "address"]);
        const idxSector = getIndex(["zona", "sector", "ciudad", "city"]);

        if (idxName === -1 || idxTaxId === -1) {
            return { success: false, errors: ["El archivo debe contener las columnas de Nombre y Documento (NIT/CC)."] };
        }

        for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim();
            if (!line) continue;

            const cols = line.split(delimiter);
            const clean = (val: string | undefined) => val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";

            const name = clean(cols[idxName]);
            const company = idxCompany !== -1 ? clean(cols[idxCompany]) : "";
            let taxId = clean(cols[idxTaxId]);
            const phone = idxPhone !== -1 ? clean(cols[idxPhone]) : "";
            const email = idxEmail !== -1 ? clean(cols[idxEmail]) : "";
            const address = idxAddress !== -1 ? clean(cols[idxAddress]) : "";
            const sector = idxSector !== -1 ? clean(cols[idxSector]) : "";

            if (!name || !taxId) {
                errors.push(`Fila ${i + 1}: Faltan datos requeridos (Nombre o Documento).`);
                continue;
            }

            try {
                // Ensure Sector exists if provided
                if (sector) {
                    const existingZone = await prisma.logisticZone.findFirst({
                        where: { name: sector.toUpperCase(), organizationId: orgId }
                    });
                    if (!existingZone) {
                        try {
                            await prisma.logisticZone.create({
                                data: { name: sector.toUpperCase(), organizationId: orgId }
                            });
                        } catch (e) {
                            // Ignore race conditions for zones
                        }
                    }
                }

                const existingCustomer = await prisma.customer.findFirst({
                    where: {
                        organizationId: orgId,
                        taxId: taxId.toUpperCase()
                    }
                });

                if (existingCustomer) {
                    // Opt to update if exists? Or skip? Let's skip to avoid overwriting newer data unless requested.
                    errors.push(`Fila ${i + 1}: El cliente con NIT ${taxId} ya existe. Ignorado.`);
                } else {
                    await prisma.customer.create({
                        data: {
                            name: name.toUpperCase(),
                            companyName: company ? company.toUpperCase() : null,
                            taxId: taxId.toUpperCase(),
                            phone: phone || null,
                            email: email || null,
                            address: address ? address.toUpperCase() : null,
                            sector: sector ? sector.toUpperCase() : null,
                            organizationId: orgId
                        }
                    });
                    processedCount++;
                }

            } catch (e) {
                console.error(e);
                errors.push(`Fila ${i + 1}: Error al procesar - ${(e as Error).message}`);
            }
        }

        revalidatePath("/directory/customers");
        return { success: true, errors, count: processedCount };
    } catch (e) {
        console.error("FATAL IMPORT ERROR:", e);
        return { success: false, errors: ["Error crítico al procesar archivo: " + (e as Error).message] };
    }
}

export async function bulkImportDebts(formData: FormData) {
    const orgId = await getOrgId();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha subido ningún archivo.");

    try {
        const text = await file.text();
        const rows = text.split("\n");
        const firstLine = rows[0]?.toLowerCase() || "";
        const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

        const errors: string[] = [];
        let processedCount = 0;

        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        const idxTaxId = getIndex(["doc", "nit", "cc", "cédula", "nif"]);
        const idxInvoice = getIndex(["factura", "doc num", "invoice"]);
        const idxDate = getIndex(["fecha", "date"]);
        const idxTotal = getIndex(["total", "monto", "amount"]);
        const idxPending = getIndex(["pendiente", "pdte", "cobrar", "deuda"]);
        const idxConcept = getIndex(["concepto", "descripción", "notas"]);

        if (idxTaxId === -1 || idxInvoice === -1 || idxTotal === -1) {
            return { success: false, errors: ["El archivo debe contener al menos: NIT (Documento), Número de Factura, y Total."] };
        }

        // Ensure "SALDO INICIAL HOLDED" product exists
        let dummyProduct = await prisma.product.findFirst({
            where: { organizationId: orgId, name: "SALDO INICIAL MIGRACION" }
        });

        if (!dummyProduct) {
            // Find or create 'MIGRACION' category
            let cat = await prisma.category.findFirst({ where: { name: "MIGRACION", organizationId: orgId } });
            if (!cat) {
                cat = await prisma.category.create({ data: { name: "MIGRACION", organizationId: orgId } });
            }
            dummyProduct = await prisma.product.create({
                data: {
                    name: "SALDO INICIAL MIGRACION",
                    basePrice: 0,
                    category: "MIGRACION",
                    categoryId: cat.id,
                    organizationId: orgId,
                    sku: "MIG-001",
                    upc: "MIG-001"
                }
            });
        }

        for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim();
            if (!line) continue;

            const cols = line.split(delimiter);
            const clean = (val: string | undefined) => val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";
            const parseMoney = (val: string) => {
                if (!val) return 0;
                // Remove currency symbols, space, and format correctly
                const num = Number(val.replace(/[^0-9.-]+/g, ""));
                return isNaN(num) ? 0 : num;
            };

            const taxId = clean(cols[idxTaxId]).toUpperCase();
            const invoiceNum = clean(cols[idxInvoice]);

            // Try to parse DD/MM/YYYY or YYYY-MM-DD
            const dateStr = idxDate !== -1 ? clean(cols[idxDate]) : "";
            let parsedDate = new Date();
            if (dateStr) {
                const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY if first is > 12 or if typical format
                    if (parts[2].length === 4) {
                        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
                    } else {
                        parsedDate = new Date(dateStr);
                    }
                }
            }

            const total = parseMoney(clean(cols[idxTotal]));

            let amountPaid = 0;
            if (idxPending !== -1) {
                const pending = parseMoney(clean(cols[idxPending]));
                amountPaid = total - pending;
                if (amountPaid < 0) amountPaid = 0;
            }

            const concept = idxConcept !== -1 ? clean(cols[idxConcept]) : "Migración Holded";

            if (!taxId || !invoiceNum) {
                errors.push(`Fila ${i + 1}: Faltan datos (NIT o Factura).`);
                continue;
            }

            try {
                // Find Customer
                const customer = await prisma.customer.findFirst({
                    where: { taxId: taxId, organizationId: orgId }
                });

                if (!customer) {
                    errors.push(`Fila ${i + 1}: Factura ${invoiceNum} ignorada. No se encontró el cliente con NIT ${taxId}. (Importe primero los clientes).`);
                    continue;
                }

                // Check for existing invoice to prevent duplicates
                const existingSale = await prisma.sale.findFirst({
                    where: { invoiceNumber: invoiceNum, organizationId: orgId }
                });

                if (existingSale) {
                    errors.push(`Fila ${i + 1}: La factura ${invoiceNum} ya existe en LATIDOS. Ignorada.`);
                    // Update debt if needed? Skip for now.
                    continue;
                }

                // Create Sale
                await prisma.sale.create({
                    data: {
                        invoiceNumber: invoiceNum,
                        organizationId: orgId,
                        customerId: customer.id,
                        date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                        total: total,
                        amountPaid: amountPaid,
                        paymentMethod: "TRANSFER",
                        notes: concept,
                        instances: {
                            create: {
                                productId: dummyProduct.id,
                                serialNumber: "N/A",
                                cost: 0,
                                soldPrice: total
                            }
                        }
                    }
                });
                processedCount++;

            } catch (e) {
                console.error(e);
                errors.push(`Fila ${i + 1}: Error al procesar factura ${invoiceNum} - ${(e as Error).message}`);
            }
        }

        revalidatePath("/sales");
        revalidatePath("/directory/customers");
        return { success: true, errors, count: processedCount };
    } catch (e) {
        console.error("FATAL IMPORT ERROR:", e);
        return { success: false, errors: ["Error crítico al procesar archivo: " + (e as Error).message] };
    }
}

// --- Product/Scanner Actions ---

export async function getInstanceBySerial(serial: string, options?: { includeSold?: boolean }) {
    const orgId = await getOrgId();

    // 1. Search for instance
    const instance = await prisma.instance.findFirst({
        where: {
            serialNumber: serial,
            product: { organizationId: orgId }
        },
        include: { product: true }
    });

    if (!instance) {
        throw new Error("Serial no encontrado.");
    }

    // 2. Status Check
    if (instance.status === "SOLD" && !options?.includeSold) {
        throw new Error(`El serial ${serial} ya no está disponible (Estado: ${instance.status})`);
    }

    if (instance.status !== "IN_STOCK" && instance.status !== "SOLD") {
        throw new Error(`El serial ${serial} no está disponible (Estado: ${instance.status})`);
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

        const payments = await tx.payment.findMany({
            where: { saleId: saleId },
            select: { id: true }
        });

        if (payments.length > 0) {
            const paymentIds = payments.map(p => p.id);
            await tx.transaction.deleteMany({
                where: { paymentId: { in: paymentIds } }
            });
            await tx.payment.deleteMany({
                where: { saleId: saleId }
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
    items: {
        productId: string;
        quantity: number;
        price: number;
        serials?: string[];
        warrantyActions?: Record<string, { action: 'INVENTORY' | 'LOW'; note?: string }>;
        warrantyNote?: string;
    }[];
    total: number;
};

export async function updateSale(saleId: string, data: SaleUpdateInput, auth: { pin: string, reason: string }) {
    if (!saleId) throw new Error("ID de venta requerido");
    const orgId = await getOrgId();

    const authorizedUser = await verifyPin(auth.pin);
    if (!authorizedUser) {
        throw new Error("PIN de seguridad inválido o no autorizado.");
    }

    const isOperator = authorizedUser.role === "OPERATOR";
    const userId = isOperator ? undefined : authorizedUser.id;
    const operatorId = isOperator ? authorizedUser.id : undefined;
    const userName = authorizedUser.name;

    return await prisma.$transaction(async (tx) => {
        const currentSale = await tx.sale.findFirst({
            where: { id: saleId, organizationId: orgId },
            include: { instances: { include: { product: true } } }
        });

        if (!currentSale) throw new Error("Venta no encontrada o acceso denegado.");

        const oldInstances = currentSale.instances;
        const oldTotal = Number(currentSale.total);
        let calculatedTotal = 0;
        const itemChanges: any[] = [];

        // Helper to track old state
        const groupInstances = (insts: any[]) => {
            const map = new Map();
            insts.forEach((i: any) => {
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

        // PROCESS INCOMING ITEMS
        for (const item of data.items) {
            calculatedTotal += (item.quantity * item.price);

            // Audit Logic
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

            // --- SERIALIZED ITEM LOGIC ---
            if (item.serials && item.serials.length > 0) {
                const incomingSerials = item.serials;
                const existingSerials = currentInstances.map(i => i.serialNumber).filter((s): s is string => !!s);

                const serialsToRemove = existingSerials.filter(s => !incomingSerials.includes(s));
                const serialsToAdd = incomingSerials.filter(s => !existingSerials.includes(s));
                const serialsToKeep = existingSerials.filter(s => incomingSerials.includes(s));

                // 1. Handle Removals
                for (const serial of serialsToRemove) {
                    const instance = currentInstances.find(i => i.serialNumber === serial);
                    if (instance) {
                        const warrantyAction = (item as any).warrantyActions?.[serial];
                        if (warrantyAction) {
                            // WARRANTY / RETURN
                            await tx.instance.update({
                                where: { id: instance.id },
                                data: {
                                    status: warrantyAction.action === 'LOW' ? 'DEFECTIVE' : 'RETURNED', // Changed IN_STOCK to RETURNED for traceability
                                    condition: warrantyAction.action === 'LOW' ? 'DEFECTIVE' : 'USED',
                                    saleId: currentSale.id, // Keep link
                                    warrantyNotes: warrantyAction.note ? `[${new Date().toLocaleDateString()} - ${userName}]: ${warrantyAction.note}` : undefined,
                                    returnDate: new Date(),
                                    returnBy: userName
                                } as any
                            });
                        } else {
                            // STANDARD REMOVAL
                            await tx.instance.update({
                                where: { id: instance.id },
                                data: { status: "IN_STOCK", saleId: null, soldPrice: null }
                            });
                        }
                    }
                }

                // 2. Handle Additions
                for (const serial of serialsToAdd) {
                    const instance = await tx.instance.findFirst({
                        where: { serialNumber: serial, productId: item.productId, status: "IN_STOCK" }
                    });
                    if (!instance) throw new Error(`Serial ${serial} no disponible.`);

                    await tx.instance.update({
                        where: { id: instance.id },
                        data: {
                            status: "SOLD",
                            saleId: currentSale.id,
                            soldPrice: item.price,
                            warrantyNotes: (item as any).warrantyNote ? `[${new Date().toLocaleDateString()} - ${userName}]: ${(item as any).warrantyNote}` : undefined
                        } as any
                    });
                }

                // 3. Update Kept Serials (Price / Notes)
                if (serialsToKeep.length > 0) {
                    await tx.instance.updateMany({
                        where: { saleId: currentSale.id, productId: item.productId, serialNumber: { in: serialsToKeep } },
                        data: { soldPrice: item.price }
                    });

                    if ((item as any).warrantyNote) {
                        // Apply note to ALL kept serials for this item? Or just specific ones?
                        // The UI sends `warrantyNote` at item level.
                        await tx.instance.updateMany({
                            where: { saleId: currentSale.id, productId: item.productId, serialNumber: { in: serialsToKeep } },
                            data: { warrantyNotes: `[${new Date().toLocaleDateString()} - ${userName}]: ${(item as any).warrantyNote}` } as any
                        });
                    }
                }

            } else {
                // --- GENERIC ITEM LOGIC ---
                // Manage quantity difference
                const currentQty = currentInstances.length;

                if (item.quantity < currentQty) {
                    // Reduce stock (return to inventory)
                    const removeCount = currentQty - item.quantity;
                    const instancesToRemove = currentInstances.slice(0, removeCount);
                    await tx.instance.updateMany({
                        where: { id: { in: instancesToRemove.map(i => i.id) } },
                        data: { status: "IN_STOCK", saleId: null, soldPrice: null }
                    });

                    // Update remaining price
                    const remainingInstances = currentInstances.slice(removeCount);
                    if (remainingInstances.length > 0) {
                        await tx.instance.updateMany({
                            where: { id: { in: remainingInstances.map(i => i.id) } },
                            data: { soldPrice: item.price }
                        });
                    }

                } else if (item.quantity > currentQty) {
                    // Increase stock (sell more)
                    const addCount = item.quantity - currentQty;
                    // Find generic instances
                    const availableGenerics = await tx.instance.findMany({
                        where: { productId: item.productId, status: "IN_STOCK", OR: [{ serialNumber: "N/A" }, { serialNumber: null }] },
                        take: addCount
                    });

                    if (availableGenerics.length < addCount) throw new Error(`Stock insuficiente para ${item.productId}`);

                    await tx.instance.updateMany({
                        where: { id: { in: availableGenerics.map(i => i.id) } },
                        data: { status: "SOLD", saleId: currentSale.id, soldPrice: item.price }
                    });

                    // Update existing price
                    await tx.instance.updateMany({
                        where: { id: { in: currentInstances.map(i => i.id) } },
                        data: { soldPrice: item.price }
                    });
                } else {
                    // Update price only
                    await tx.instance.updateMany({
                        where: { id: { in: currentInstances.map(i => i.id) } },
                        data: { soldPrice: item.price }
                    });
                }

                // Warnaty Note for Generics
                if ((item as any).warrantyNote) {
                    // Update all instances of this item in this sale
                    const allItemIds = [...currentInstances.map(i => i.id)]; // Need to refetch or track IDs? 
                    // Actually easier to just update by saleId + productId
                    await tx.instance.updateMany({
                        where: { saleId: currentSale.id, productId: item.productId },
                        data: { warrantyNotes: `[${new Date().toLocaleDateString()} - ${userName}]: ${(item as any).warrantyNote}` } as any
                    });
                }
            }
        } // End item loop

        // Handle Removed Items (Audit)
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

        // Release Completely Removed Products
        const newProductIds = new Set(data.items.map(i => i.productId));
        const instancesToReleaseCompletely = currentSale.instances.filter(i => !newProductIds.has(i.productId));

        if (instancesToReleaseCompletely.length > 0) {
            await tx.instance.updateMany({
                where: { id: { in: instancesToReleaseCompletely.map(i => i.id) } },
                data: { status: "IN_STOCK", saleId: null, soldPrice: null }
            });
        }

        // Final Sale Update
        await tx.sale.update({
            where: { id: saleId },
            data: {
                customerId: data.customerId,
                total: calculatedTotal,
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

    // Get the actual session user's role
    const session = await auth();
    // @ts-ignore
    const sessionRole = session?.user?.role;

    if (sessionRole !== 'ADMIN') {
        throw new Error("Permisos insuficientes. Solo administradores pueden eliminar ventas masivamente.");
    }

    // Verify the PIN exists and is valid (to confirm presence/authorization)
    const validPinUser = await verifyPin(pin);
    if (!validPinUser) throw new Error("PIN inválido o no autorizado.");

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

                const payments = await tx.payment.findMany({
                    where: { saleId: id },
                    select: { id: true }
                });

                if (payments.length > 0) {
                    const paymentIds = payments.map(p => p.id);
                    await tx.transaction.deleteMany({
                        where: { paymentId: { in: paymentIds } }
                    });
                    await tx.payment.deleteMany({
                        where: { saleId: id }
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

export async function wipeFinanceData(pin: string) {
    const orgId = await getOrgId();

    // Get the actual session user's role
    const session = await auth();
    // @ts-ignore
    const sessionRole = session?.user?.role;

    if (sessionRole !== 'ADMIN') {
        throw new Error("Permisos insuficientes. Solo administradores pueden realizar esta acción destructiva.");
    }

    // Verify the PIN exists and is valid (to confirm presence/authorization)
    const validPinUser = await verifyPin(pin);
    if (!validPinUser) throw new Error("PIN inválido o no autorizado.");

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Reset all sold instances back to stock
            await tx.instance.updateMany({
                where: { product: { organizationId: orgId }, saleId: { not: null } },
                data: {
                    status: "IN_STOCK",
                    saleId: null,
                    soldPrice: null,
                    updatedAt: new Date()
                }
            });

            // 2. Delete all Sale Audits
            const sales = await tx.sale.findMany({ where: { organizationId: orgId }, select: { id: true } });
            const saleIds = sales.map(s => s.id);

            if (saleIds.length > 0) {
                await tx.saleAudit.deleteMany({
                    where: { saleId: { in: saleIds } }
                });
            }

            // 3. Delete all Transactions
            await tx.transaction.deleteMany({
                where: { organizationId: orgId }
            });

            // 4. Delete all Payments
            await tx.payment.deleteMany({
                where: { organizationId: orgId }
            });

            // 5. Delete all Sales
            await tx.sale.deleteMany({
                where: { organizationId: orgId }
            });

            // 6. Reset all Account balances to 0
            await tx.paymentAccount.updateMany({
                where: { organizationId: orgId },
                data: { balance: 0 }
            });
        });

        revalidatePath("/sales");
        revalidatePath("/dashboard");
        revalidatePath("/finance");
        revalidatePath("/inventory");

        return { success: true };
    } catch (error) {
        console.error("Wipe Finance Data Error:", error);
        throw new Error("Error al borrar datos financieros: " + (error instanceof Error ? error.message : String(error)));
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
// --- Receipt Printing Support ---

export async function getReceiptData(saleId: string) {
    const orgId = await getOrgId();

    // 1. Fetch Sale Details with all needed relations
    const sale = await prisma.sale.findFirst({
        where: { id: saleId, organizationId: orgId },
        include: {
            customer: true,
            instances: {
                include: { product: true }
            }
        }
    });

    if (!sale) return { sale: null, organization: null };

    // 2. Fetch Organization Profile for Branding
    const organization = await prisma.organizationProfile.findUnique({
        where: { organizationId: orgId }
    });

    return {
        sale: {
            ...sale,
            total: sale.total.toNumber(),
            amountPaid: sale.amountPaid.toNumber()
        },
        organization
    };
}
