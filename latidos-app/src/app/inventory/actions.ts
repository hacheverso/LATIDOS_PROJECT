"use server";

import * as fs from 'fs';
import * as path from 'path';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { compare } from "bcryptjs";


// const prisma = new PrismaClient(); // Removed in favor of singleton

export async function updateProductPrice(id: string, price: number) {
    try {
        await prisma.product.update({
            where: { id },
            data: { basePrice: price }
        });
        revalidatePath("/inventory");
        return { success: true };
    } catch (e) {
        console.error("Error updating price:", e);
        return { success: false, error: "Error al actualizar precio." };
    }
}

export async function createProduct(formData: FormData) {
    const name = formData.get("name") as string;
    const categoryName = (formData.get("category") as string)?.toUpperCase();
    const condition = formData.get("condition") as string;
    const state = condition === "NEW" ? "Nuevo" : condition === "OPEN_BOX" ? "Open Box" : "Usado";

    const upc = formData.get("upc") as string;
    const sku = formData.get("sku") as string;
    const imageUrl = formData.get("imageUrl") as string || null;

    if (!name || !sku || !upc || !categoryName) {
        throw new Error("Faltan campos obligatorios");
    }

    // Find or Create Category
    let categoryRel = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!categoryRel) {
        categoryRel = await prisma.category.create({ data: { name: categoryName } });
    }

    try {
        await prisma.product.create({
            data: {
                name,
                category: categoryName, // Keep legacy string for now
                categoryId: categoryRel.id,
                state,
                upc,
                sku,
                imageUrl
            }
        });
    } catch (e) {
        // eslint-disable-next-line
        if ((e as any).code === 'P2002') {
            throw new Error("El SKU o UPC ya existe.");
        }
        throw new Error("Error al crear el producto: " + (e instanceof Error ? e.message : String(e)));
    }

    revalidatePath("/inventory");
    redirect("/inventory");
}

export async function updateProduct(id: string, data: { name: string; basePrice: number; imageUrl?: string; category: string }) {
    const categoryName = data.category.toUpperCase();

    // Find or Create Category
    let categoryRel = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!categoryRel) {
        categoryRel = await prisma.category.create({ data: { name: categoryName } });
    }

    try {
        await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                basePrice: data.basePrice,
                imageUrl: data.imageUrl,
                category: categoryName,
                categoryId: categoryRel.id
            }
        });
        revalidatePath("/inventory");
        revalidatePath(`/inventory/${id}`);
    } catch (e) {
        throw new Error("Error al actualizar producto: " + (e instanceof Error ? e.message : String(e)));
    }
}

export async function bulkDeleteProducts(ids: string[]) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "No autorizado." };
    }

    try {
        await prisma.product.deleteMany({
            where: {
                id: { in: ids }
            }
        });
        revalidatePath("/inventory");
        return { success: true };
    } catch (e) {
        console.error("Error deleting products:", e);
        return { success: false, error: "Error al eliminar productos. Verifique que no tengan ventas asociadas." };
    }
}

export async function bulkMoveProducts(productIds: string[], targetCategoryName: string) {
    // 1. Find or Ensure Category Exists
    let targetCat = await prisma.category.findUnique({ where: { name: targetCategoryName } });

    // If not found, should we create it? Ideally yes, or throw error.
    // For bulk move, usually we select from existing, but let's be safe.
    if (!targetCat) {
        targetCat = await prisma.category.create({ data: { name: targetCategoryName } });
    }

    // 2. Update Products
    await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: {
            categoryId: targetCat.id,
            category: targetCat.name // Update legacy string
        }
    });

    revalidatePath("/inventory");
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id },
        });
    } catch (e) {
        throw new Error("Error al eliminar el producto: " + (e instanceof Error ? e.message : String(e)));
    }
    revalidatePath("/inventory");
}

export async function getProductByUpc(upc: string) {
    const product = await prisma.product.findUnique({
        where: { upc },
    });
    return product;
}

export async function generateUniqueSku(baseSku: string) {
    // Check if exact match exists
    const exactMatch = await prisma.product.findUnique({
        where: { sku: baseSku }
    });

    if (!exactMatch) return baseSku;

    // Find all collisions starting with baseSku
    // e.g., if base is RB-MT-SKYL-N, we look for RB-MT-SKYL-N1, -N2...
    // Pattern: baseSku + number
    const collisions = await prisma.product.findMany({
        where: {
            sku: {
                startsWith: baseSku
            }
        },
        select: { sku: true }
    });

    // Extract numbers from suffixes
    let maxSuffix = 0;
    const regex = new RegExp(`^${baseSku}(\\d+)$`);

    collisions.forEach(p => {
        if (p.sku === baseSku) {
            // existing base counts as 0 effectively, but we need to go to 1
        }
        const match = p.sku.match(regex);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxSuffix) maxSuffix = num;
        }
    });

    return `${baseSku}${maxSuffix + 1}`;
}

// --- INBOUND SECURITY HELPER ACTIONS ---

export async function generateReceptionNumber() {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${yy}${mm}`;

    const last = await prisma.purchase.findFirst({
        where: { receptionNumber: { startsWith: prefix } },
        orderBy: { receptionNumber: 'desc' },
        select: { receptionNumber: true }
    });

    let seq = 1;
    if (last?.receptionNumber) {
        const lastSeq = parseInt(last.receptionNumber.substring(4));
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
}

export async function checkDuplicateSerials(serials: string[]) {
    const validSerials = serials.filter(s => s && s.trim().length > 0 && !s.startsWith("BULK"));
    if (validSerials.length === 0) return [];

    const found = await prisma.instance.findMany({
        where: {
            serialNumber: { in: validSerials },
            // Only flag as duplicate if it's currently active in inventory
            status: { in: ["IN_STOCK", "PENDING"] }
        },
        select: { serialNumber: true }
    });

    return found.map(f => f.serialNumber);
}

export async function confirmPurchase(purchaseId: string) {
    try {
        await prisma.purchase.update({
            where: { id: purchaseId },
            data: { status: "CONFIRMED" }
        });

        await prisma.instance.updateMany({
            where: { purchaseId },
            data: { status: "IN_STOCK" }
        });

        revalidatePath("/inventory/purchases");
        return { success: true };
    } catch (error) {
        console.error("Error confirming purchase:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido al confirmar." };
    }
}

export async function createPurchase(
    supplierId: string,
    currency: string,
    exchangeRate: number,
    itemData: { sku: string; serial: string; cost: number; originalCost: number; productId: string; }[],
    attendant: string,
    notes: string
) {
    if (!supplierId) throw new Error("Debe seleccionar un proveedor.");
    if (!attendant) throw new Error("Debe asignar un encargado.");
    if (itemData.length === 0) throw new Error("No hay items para registrar.");

    // 1. Security: Check Duplicates (Triple check, frontend should have caught it)
    const serialsToCheck = itemData.map(i => i.serial).filter(s => s && !s.startsWith("BULK"));
    if (serialsToCheck.length > 0) {
        const duplicates = await checkDuplicateSerials(serialsToCheck);
        if (duplicates.length > 0) {
            // Filter out nulls if any
            const cleanDups = duplicates.filter(d => d !== null) as string[];
            if (cleanDups.length > 0) {
                throw new Error(`CRÍTICO: Seriales ya existentes detectados: ${cleanDups.join(", ")}`);
            }
        }
    }

    const totalCost = itemData.reduce((acc, item) => acc + item.cost, 0);

    // 2. Generate Reception Number
    const receptionNumber = await generateReceptionNumber();

    // 3. Create Purchase with Nested Instances
    // Status: DRAFT, Instances: PENDING
    const purchase = await prisma.purchase.create({
        data: {
            supplierId: supplierId,
            totalCost,
            currency,
            exchangeRate,
            status: "DRAFT", // Stays in Draft until confirmed
            receptionNumber,
            notes: notes || "Ingreso Manual desde Recepción Inteligente",
            attendant,
            instances: {
                create: itemData.map(item => ({
                    productId: item.productId,
                    serialNumber: item.serial.startsWith("BULK") ? null : item.serial, // Store null for bulk to allow multiple
                    // Note: If schema has serialNumber unique, storing null is allowed for multiple rows in Postgres.
                    status: "PENDING", // Wait for Confirmation
                    condition: "NEW",
                    cost: item.cost,
                    originalCost: item.originalCost,
                    // Store the BULK ID in notes or ignore? 
                    // If we need to track 'quantity' of bulk items, we rely on count of instances.
                }))
            }
        }
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/purchases");

    // No redirect? Or redirect to History?
    // Frontend handles redirect usually now.
    return purchase;
}

export async function getSuppliers() {
    const suppliers = await prisma.supplier.findMany({
        orderBy: { name: 'asc' }
    });
    return suppliers;
}

export async function getCategories() {
    // Fetch unique categories from Category table
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
    });
    return categories.map(c => c.name);
}

// --- CATEGORY SYSTEM (NEW) ---

export async function ensureCategories() {
    // Migration Helper: Creates Categories from existing Product strings
    const distinctCategories = await prisma.product.findMany({
        distinct: ['category'],
        select: { category: true }
    });

    let created = 0;
    for (const p of distinctCategories) {
        if (!p.category) continue;
        const exists = await prisma.category.findUnique({ where: { name: p.category.toUpperCase() } });
        if (!exists) {
            await prisma.category.create({
                data: { name: p.category.toUpperCase() }
            });
            created++;
        }
    }

    // Link products
    const categories = await prisma.category.findMany();
    for (const cat of categories) {
        await prisma.product.updateMany({
            where: { category: cat.name }, // Match by string
            data: { categoryId: cat.id }
        });
    }

    revalidatePath("/inventory");
    return { created, total: distinctCategories.length };
}

export async function getCategoriesWithCount() {
    // Return categories including count of products
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: { products: true }
            }
        },
        orderBy: { name: 'asc' }
    });
    return categories;
}

export async function createCategory(name: string) {
    if (!name) throw new Error("Nombre requerido");
    try {
        const newCat = await prisma.category.create({
            data: { name: name.toUpperCase() }
        });
        revalidatePath("/inventory");
        return newCat;
    } catch (e) {
        if ((e as any).code === 'P2002') throw new Error("La categoría ya existe");
        throw e;
    }
}

export async function updateCategory(id: string, name: string) {
    await prisma.category.update({
        where: { id },
        data: { name: name.toUpperCase() }
    });
    // Also update legacy string field on products for consistency until fully deprecated?
    // Actually, if we rely on relation, legacy string 'category' becomes stale.
    // Let's update it to keep sync for now.
    await prisma.product.updateMany({
        where: { categoryId: id },
        data: { category: name.toUpperCase() }
    });

    revalidatePath("/inventory");
}


export async function searchProducts(query: string) {
    if (!query || query.length < 2) return [];

    // Clean query
    const cleanQuery = query.trim().toUpperCase();

    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: cleanQuery } },
                { sku: { contains: cleanQuery } },
                { upc: { contains: cleanQuery } },
            ]
        },
        take: 5,
        select: {
            id: true,
            name: true,
            sku: true,
            upc: true,
            imageUrl: true,
        }
    });

    return products;
}

export async function bulkCreateProducts(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha subido ningún archivo.");

    try {
        const text = await file.text();
        const rows = text.split("\n");
        // Detect delimiter from first row
        const firstLine = rows[0]?.toLowerCase() || "";
        const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

        console.log("DEBUG IMPORT: Delimiter detected:", delimiter);
        console.log("DEBUG IMPORT: Header:", firstLine);

        const errors: string[] = [];

        // Parse Headers to find indices
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

        // Dynamic Mapping Helper
        const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        // Define priority keywords for each field
        const idxUPC = getIndex(["upc", "code", "código", "codigo"]);
        const idxSKU = getIndex(["sku", "ref"]);
        const idxName = getIndex(["name", "nombre", "producto"]);
        const idxCategory = getIndex(["cat", "categoría", "categoria"]);
        const idxState = getIndex(["est", "state", "cond"]);
        const idxPrice = getIndex(["precio", "price", "venta"]);
        const idxImage = getIndex(["img", "foto", "url", "image"]);
        const idxQty = getIndex(["cant", "qty", "stock", "cantidad", "unidades"]);

        // 1. Pre-fetch Categories for Case-Insensitive Matching
        const existingCategories = await prisma.category.findMany();
        const categoryMap = new Map<string, string>(); // NormalizedName -> ID
        existingCategories.forEach(c => {
            categoryMap.set(c.name.trim().toUpperCase(), c.id);
        });

        // Ensure "GENERAL" category exists
        if (!categoryMap.has("GENERAL")) {
            const gen = await prisma.category.create({ data: { name: "GENERAL" } });
            categoryMap.set("GENERAL", gen.id);
        }

        // Ensure generic purchase header for stock initialization
        let initialPurchase = await prisma.purchase.findFirst({ where: { notes: "IMPORTACIÓN_MASIVA_STOCK" } });
        if (!initialPurchase) {
            let supplier = await prisma.supplier.findFirst({ where: { name: "INVENTARIO INICIAL" } });
            if (!supplier) {
                supplier = await prisma.supplier.create({
                    data: { name: "INVENTARIO INICIAL", nit: "000-000-000" }
                });
            }
            initialPurchase = await prisma.purchase.create({
                data: {
                    supplierId: supplier.id,
                    totalCost: 0,
                    status: "COMPLETED",
                    notes: "IMPORTACIÓN_MASIVA_STOCK",
                    date: new Date()
                }
            });
        }

        const parseCurrency = (val: string | undefined) => {
            if (!val) return 0;
            if (val.toUpperCase().includes("NO VENDIDO")) return 0;
            // Robust cleanup: remove $, #, whitespace
            let clean = val.replace(/[$\s#]/g, "");
            // Assume Dot = Thousands (CO Format) if comma exists later, else assume it might be dot decimal? 
            // Better heuristic: Remove all non-numeric except last separator? 
            // Simplest for CO: Remove dots, replace comma with dot.
            clean = clean.replace(/\./g, "");
            clean = clean.replace(",", ".");
            return parseFloat(clean) || 0;
        };

        let processedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim();
            if (!line) continue;

            try {
                const cols = line.split(delimiter);
                const clean = (val: string | undefined) => val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";

                // --- MAPPING LOGIC START ---
                let upc = idxUPC !== -1 ? clean(cols[idxUPC]) : "";
                const name = idxName !== -1 ? clean(cols[idxName]) : "";
                let sku = idxSKU !== -1 ? clean(cols[idxSKU]) : "";

                // Category Login: Normalize & Upsert
                let categoryName = idxCategory !== -1 ? clean(cols[idxCategory]) : "GENERAL";
                if (!categoryName) categoryName = "GENERAL";

                const normalizedCat = categoryName.trim().toUpperCase();
                let categoryId = categoryMap.get(normalizedCat);

                if (!categoryId) {
                    // Create new Category on the fly
                    const newCat = await prisma.category.create({ data: { name: categoryName.toUpperCase() } }); // Use original casing uppercased? User said ignore case. Let's force Upper for consistency
                    categoryId = newCat.id;
                    categoryMap.set(normalizedCat, categoryId);
                }

                const state = idxState !== -1 ? clean(cols[idxState]) : "Nuevo";
                const price = idxPrice !== -1 ? parseCurrency(cols[idxPrice]) : 0;
                const imageUrl = idxImage !== -1 ? clean(cols[idxImage]) : null;
                const quantity = idxQty !== -1 ? (parseInt(clean(cols[idxQty])) || 0) : 0;

                // Fallbacks logic
                if (!upc && !name) {
                    if (cols[0] && /^\d+$/.test(clean(cols[0]))) {
                        upc = clean(cols[0]);
                        sku = clean(cols[1]);
                    }
                }

                if (!name || !upc) continue; // Skip incomplete

                if (!sku) {
                    sku = `${name.substring(0, 3).toUpperCase()}-${upc.substring(upc.length - 4)}`.replace(/\s+/g, '');
                }
                // --- MAPPING LOGIC END ---

                // Upsert Product
                let productId = "";
                const existing = await prisma.product.findUnique({ where: { upc } });

                if (existing) {
                    productId = existing.id;
                    await prisma.product.update({
                        where: { id: existing.id },
                        data: {
                            name,
                            category: categoryName.toUpperCase(), // Legacy field
                            categoryId: categoryId,
                            imageUrl: imageUrl || existing.imageUrl,
                            basePrice: price > 0 ? price : existing.basePrice
                        }
                    });
                } else {
                    const newProduct = await prisma.product.create({
                        data: {
                            name,
                            category: categoryName.toUpperCase(), // Legacy field
                            categoryId: categoryId,
                            state,
                            upc,
                            sku,
                            imageUrl,
                            basePrice: price > 0 ? price : 0
                        }
                    });
                    productId = newProduct.id;
                }

                // Initialize Stock (If Quantity Provided)
                if (quantity > 0) {
                    // Create instances
                    const instancesData = Array(quantity).fill(null).map(() => ({
                        productId: productId,
                        purchaseId: initialPurchase.id,
                        status: "IN_STOCK",
                        condition: "NEW",
                        cost: 0, // Assumption: Import doesn't provide cost, or we default to 0. If cost col exists we could use it.
                        // Wait, user complained about "Agotado". 
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));

                    await prisma.instance.createMany({ data: instancesData });
                }

                processedCount++;
            } catch (e) {
                console.error(e);
                errors.push(`Fila ${i + 1}: Error al procesar - ${(e as Error).message}`);
            }
        }

        revalidatePath("/inventory");
        return { success: true, errors, count: processedCount };
    } catch (e) {
        // eslint-disable-next-line
        console.error("FATAL IMPORT ERROR:", e);
        return { success: false, errors: ["Error crítico al procesar archivo: " + (e as Error).message] };
    }
}

export async function loadInitialBalance(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha subido ningún archivo.");

    // Create unique log entry
    const logPath = path.join(process.cwd(), 'debug_import.txt');
    const log = (msg: string) => {
        try {
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
        } catch (e) { console.error("Log failed", e); }
    };

    log("--- INICIO CARGA SALDO ---");

    try {
        const text = await file.text();
        const rows = text.split("\n"); // Raw split first
        const errors: string[] = [];
        let processedCount = 0;

        // Detect Sep
        const firstLine = rows[0]?.toLowerCase() || "";
        const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

        log(`Delimiter: ${delimiter === "\t" ? "TAB" : delimiter}`);
        log(`Header: ${firstLine}`);

        // Parse Headers
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        const idxUPC = getIndex(["upc", "code", "código"]);
        const idxQty = getIndex(["cant", "stock", "qty", "cantidad", "unidades"]);
        const idxCost = getIndex(["cost", "costo"]);
        const idxPrice = getIndex(["prec", "price", "venta"]); // "Precio", "# PRECIO"
        const idxDays = getIndex(["dia", "day", "antiguedad", "old", "dias"]);

        log(`Indices: UPC=${idxUPC}, Price=${idxPrice}, Cost=${idxCost}, Days=${idxDays}`);

        // 1. Ensure 'SALDO INICIAL' Purchase Header exists
        let purchase = await prisma.purchase.findFirst({
            where: { notes: "CARGA_INICIAL_MASIVA" }
        });

        if (!purchase) {
            // Ensure Supplier
            let supplier = await prisma.supplier.findFirst({ where: { name: "INVENTARIO INICIAL" } });
            if (!supplier) {
                supplier = await prisma.supplier.create({
                    data: { name: "INVENTARIO INICIAL", nit: "000-000-000" }
                });
            }

            purchase = await prisma.purchase.create({
                data: {
                    supplierId: supplier.id,
                    totalCost: 0,
                    status: "COMPLETED",
                    notes: "CARGA_INICIAL_MASIVA",
                    date: new Date()
                }
            });
        }

        // 2. Process File
        const parseCurrency = (val: string | undefined) => {
            if (!val) return 0;
            if (val.toUpperCase().includes("NO VENDIDO")) return 0;
            // Remove $, #, whitespace using regex
            let clean = val.replace(/[$\s#]/g, "");

            // Assume Dot = Thousands (CO Format): 1.000.000 -> 1000000
            clean = clean.replace(/\./g, "");
            // Assume Comma = Decimal: 10,50 -> 10.50
            clean = clean.replace(",", ".");

            return parseFloat(clean) || 0;
        };

        let debugMsg = "";

        for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim();
            if (!line) continue;

            try {
                const cols = line.split(delimiter);
                const clean = (val: string | undefined) => val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";

                let upc = idxUPC !== -1 ? clean(cols[idxUPC]) : "";

                // Fallback: If no headers found at all, maybe user file is standard?
                // Standard: UPC(0), SKU(1), Name(2), Qty(3), Cost(4), Price(5), Days(6) (Based on screenshot)
                if (idxUPC === -1 && idxQty === -1) {
                    // Try indices
                    if (cols.length >= 4) {
                        upc = clean(cols[0]);
                    }
                }

                if (!upc) continue;

                const quantity = idxQty !== -1 ? parseInt(clean(cols[idxQty])) || 0 : (cols.length > 3 ? parseInt(clean(cols[3])) || 0 : 0);
                const cost = idxCost !== -1 ? parseCurrency(cols[idxCost]) : (cols.length > 4 ? parseCurrency(cols[4]) : 0);
                const price = idxPrice !== -1 ? parseCurrency(cols[idxPrice]) : (cols.length > 5 ? parseCurrency(cols[5]) : 0);

                // Extra sanity check for price: If price is weirdly small (< 1000) and cost is high, maybe it failed?
                // But products can be cheap.
                // Log weird cases
                if (price < 1000 && cost > 10000) {
                    console.warn(`Suspicious Price for UPC ${upc}: Price=${price}, Cost=${cost}`);
                }

                if (i <= 5) {
                    log(`Row ${i} UPC:${upc} | RawPrice:${idxPrice !== -1 ? cols[idxPrice] : 'N/A'} | ParsedPrice:${price}`);
                    if (!debugMsg) debugMsg = `Ejemplo: UPC ${upc} actualizado a $${price}`;
                }

                let daysOld = 0;
                let daysRaw = "";
                if (idxDays !== -1) {
                    daysRaw = clean(cols[idxDays]).toUpperCase();
                } else if (cols.length > 6) {
                    daysRaw = clean(cols[6]).toUpperCase();
                }

                if (daysRaw) {
                    if (daysRaw.includes("NO VENDIDO")) {
                        daysOld = 0;
                    } else {
                        daysOld = parseInt(daysRaw) || 0;
                    }
                }

                if (quantity <= 0) continue;

                // Calculate historical date
                const createdAtDate = new Date();
                if (daysOld > 0) {
                    createdAtDate.setDate(createdAtDate.getDate() - daysOld);
                }

                // Find Product (Strict Mode: Must exist)
                const product = await prisma.product.findUnique({ where: { upc } });

                if (!product) {
                    errors.push(`Fila ${i + 1}: Producto no encontrado (UPC: ${upc}). Ignorado.`);
                    continue;
                }

                // Update Base Price if provided
                if (price && price > 0) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { basePrice: price }
                    });
                }

                // Create N instances with backdated creation
                const instancesData = Array(quantity).fill(null).map(() => ({
                    productId: product!.id,
                    purchaseId: purchase!.id,
                    status: "IN_STOCK",
                    condition: "NEW",
                    cost: cost,
                    serialNumber: null,
                    createdAt: createdAtDate, // Backdated
                    updatedAt: createdAtDate  // Backdated
                }));



                await prisma.instance.createMany({
                    data: instancesData
                });

                processedCount += quantity;

            } catch (e) {
                console.error(e);
                log(`Error processing row ${i}: ${e}`);
                errors.push(`Fila ${i + 1}: Error procesando línea.`);
            }
        }

        revalidatePath("/inventory");
        log("--- FIN CARGA OK ---");
        return {
            success: true,
            debugMsg,
            count: processedCount,
            errors
        };

    } catch (e) {
        log(`FATAL ERROR: ${e}`);
        return { success: false, error: "Error de lectura de archivo." };
    }
}

export async function deleteAllProducts() {
    await prisma.instance.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.category.deleteMany({});
    // Keep Suppliers? Maybe.
    revalidatePath("/inventory");
}

// --- MANUAL STOCK ADJUSTMENT ---

export async function adjustStock(
    productId: string,
    quantity: number,
    reason: string,
    category: string,
    adminPin?: string,
    unitCost?: number
) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) throw new Error("Usuario no encontrado");

    // 1. Security Check
    // If not Admin, MUST provide valid Admin PIN
    if (user.role !== "ADMIN") {
        if (!adminPin) {
            throw new Error("Requiere PIN de Administrador");
        }

        const admins = await prisma.user.findMany({
            where: { role: "ADMIN", securityPin: { not: null } }
        });

        let authorized = false;

        for (const admin of admins) {
            if (admin.securityPin) {
                if (admin.securityPin === adminPin) {
                    authorized = true;
                    break;
                }
                const match = await compare(adminPin, admin.securityPin).catch(() => false);
                if (match) {
                    authorized = true;
                    break;
                }
            }
        }

        if (!authorized) {
            throw new Error("PIN de Administrador inválido");
        }
    }

    if (quantity === 0) throw new Error("La cantidad no puede ser 0");
    if (!reason) throw new Error("Debe indicar el motivo");

    // 2. Perform Adjustment
    try {
        await prisma.$transaction(async (tx) => {
            // Create Adjustment Record
            // @ts-ignore: Pending Prisma Client Regeneration (Restart Server)
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    quantity,
                    reason,
                    category,
                    userId: user.id
                }
            });

            if (quantity > 0) {
                // ADD STOCK
                const product = await tx.product.findUnique({ where: { id: productId } });
                if (!product) throw new Error("Producto no encontrado");

                const instancesData = Array(quantity).fill(null).map(() => ({
                    productId,
                    status: "IN_STOCK",
                    condition: "NEW", // Default
                    cost: unitCost !== undefined ? unitCost : product.basePrice, // Use provided cost or fallback (though basePrice is technically sale price, wait, fallback should ideally be averageCost but backend doesn't have it easily unless queries. Let's stick to unitCost passed from frontend which defaults to averageCost)
                    // @ts-ignore: Pending Prisma Client Regeneration
                    adjustmentId: adjustment.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));

                await tx.instance.createMany({
                    data: instancesData
                });

            } else {
                // REMOVE STOCK
                const absQty = Math.abs(quantity);
                const candidates = await tx.instance.findMany({
                    where: { productId, status: "IN_STOCK" },
                    orderBy: { createdAt: 'asc' }, // FIFO: Oldest first
                    take: absQty
                });

                if (candidates.length < absQty) {
                    throw new Error(`No hay suficiente stock para descontar. Disponible: ${candidates.length}`);
                }

                const idsToUpdate = candidates.map(c => c.id);
                await tx.instance.updateMany({
                    where: { id: { in: idsToUpdate } },
                    data: {
                        status: "ADJUSTMENT",
                        // @ts-ignore: Pending Prisma Client Regeneration
                        adjustmentId: adjustment.id
                    }
                });
            }
        });

        revalidatePath(`/inventory/${productId}`);
        revalidatePath("/inventory");
        return { success: true };

    } catch (e) {
        console.error("Adjustment Error:", e);
        throw new Error(e instanceof Error ? e.message : "Error al realizar ajuste");
    }
}

// --- INTELLIGENCE ACTIONS ---

export async function getProductIntelligence(productId: string) {
    // 1. Calculate Days in Inventory (Average of current stock)
    const stock = await prisma.instance.findMany({
        where: { productId, status: "IN_STOCK" },
        select: { createdAt: true, cost: true }
    });

    let daysInInventory = 0;
    if (stock.length > 0) {
        const now = new Date().getTime();
        const totalAge = stock.reduce((sum, item) => sum + (now - new Date(item.createdAt).getTime()), 0);
        daysInInventory = Math.floor((totalAge / stock.length) / (1000 * 60 * 60 * 24));
    }

    // 2. Calculate Weekly Velocity (Last 30 days sales / 4)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesCount = await prisma.instance.count({
        where: {
            productId,
            status: "SOLD",
            updatedAt: { gte: thirtyDaysAgo }
        }
    });

    const weeklyVelocity = Math.round((salesCount / 4) * 10) / 10;

    // 3. Margin Calculation
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { basePrice: true }
    });

    let marginPercent = 0;
    if (product && stock.length > 0) {
        // Average cost of current stock
        const totalCost = stock.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
        const avgCost = totalCost / stock.length;
        if (Number(product.basePrice) > 0) {
            marginPercent = ((Number(product.basePrice) - avgCost) / Number(product.basePrice)) * 100;
        }
    }

    // 4. Generate AI Suggestion
    let suggestion = "Desempeño normal.";
    let alertLevel = "normal";

    if (daysInInventory > 60) {
        suggestion = "Producto estancado. Considerar promoción o descuento para liberar capital.";
        alertLevel = "warning";
    } else if (weeklyVelocity > 10 && daysInInventory < 7) {
        suggestion = "Alta rotación con bajo stock. Riesgo de quiebre. Reordenar urgente.";
        alertLevel = "critical";
    } else if (marginPercent < 10) {
        suggestion = "Margen crítico. Revisar costos de proveedor o ajustar precio base.";
        alertLevel = "warning";
    }

    return {
        daysInInventory,
        weeklyVelocity,
        marginPercent,
        suggestion,
        alertLevel
    };
}

export async function getDashboardMetrics() {
    // 1. Inventory Value & Units
    const allStock = await prisma.instance.findMany({
        where: { status: "IN_STOCK" },
        select: { cost: true, createdAt: true, productId: true }
    });

    const totalUnits = allStock.length;
    const inventoryValue = allStock.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);

    // 2. Stagnant Capital (> 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const stagnantItems = allStock.filter(i => new Date(i.createdAt) < thirtyDaysAgo);
    const stagnantCapital = stagnantItems.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);

    // 3. Category Distribution
    const products = await prisma.product.findMany({
        select: { id: true, name: true, sku: true, basePrice: true, category: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    const categoryStats = new Map<string, number>();
    allStock.forEach(item => {
        const p = productMap.get(item.productId);
        const cat = p?.category || "GENERAL";
        categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
    });

    const categoryDistribution = Array.from(categoryStats.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

    // 4. Analysis Per Product (Avg Cost, Margin)
    const productStats = new Map<string, { totalCost: number, count: number }>();
    allStock.forEach(item => {
        const curr = productStats.get(item.productId) || { totalCost: 0, count: 0 };
        curr.totalCost += Number(item.cost) || 0;
        curr.count++;
        productStats.set(item.productId, curr);
    });

    const opportunities = [];
    const replenishmentAlerts = [];

    for (const p of products) {
        const stats = productStats.get(p.id);
        if (stats && stats.count > 0) {
            // Margin Check
            const avgCost = stats.totalCost / stats.count;
            if (Number(p.basePrice) > 0) {
                const margin = ((Number(p.basePrice) - avgCost) / Number(p.basePrice)) * 100;
                if (margin < 25) { // Threshold for opportunity
                    opportunities.push({
                        id: p.id,
                        name: p.name,
                        sku: p.sku,
                        avgCost,
                        lastCost: avgCost,
                        currentPrice: Number(p.basePrice),
                        marginPercent: margin
                    });
                }
            }

            // Low Stock Check (Simple)
            if (stats.count < 3) {
                replenishmentAlerts.push({ id: p.id, name: p.name, sku: p.sku });
            }
        }
    }

    // 5. History Series (Mocked for safety to avoid breakage)
    const historySeries = [
        { name: 'Ene', income: 4000, expense: 2400 },
        { name: 'Feb', income: 3000, expense: 1398 },
        { name: 'Mar', income: 2000, expense: 9800 },
        { name: 'Abr', income: 2780, expense: 3908 },
        { name: 'May', income: 1890, expense: 4800 },
        { name: 'Jun', income: 2390, expense: 3800 },
    ];

    return {
        inventoryValue,
        totalUnits,
        stagnantCapital,
        priceReviewCount: opportunities.length,
        categoryDistribution,
        historySeries,
        opportunities: opportunities.sort((a, b) => a.marginPercent - b.marginPercent).slice(0, 10),
        replenishmentAlerts: replenishmentAlerts.slice(0, 6)
    };
}

// --- RESTORED MISSING ACTIONS ---

export async function getLastProductCost(productId: string) {
    try {
        const lastInstance = await prisma.instance.findFirst({
            where: { productId, cost: { gt: 0 } },
            orderBy: { createdAt: 'desc' },
            select: { cost: true }
        });
        return lastInstance?.cost ? Number(lastInstance.cost) : 0;
    } catch (e) {
        return 0;
    }
}

export async function getPurchaseDetails(purchaseId: string) {
    try {
        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                supplier: true,
                instances: {
                    include: { product: true }
                }
            }
        });

        if (!purchase) return null;

        return {
            purchase,
            items: purchase.instances.map(i => ({
                instanceId: i.id,
                sku: i.product.sku,
                serial: i.serialNumber,
                productId: i.productId,
                productName: i.product.name,
                cost: Number(i.cost),
                originalCost: Number(i.cost),
                upc: i.product.upc,
                timestamp: i.createdAt.toISOString()
            }))
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updatePurchase(
    purchaseId: string,
    supplierId: string,
    currency: string,
    exchangeRate: number,
    items: { instanceId?: string; sku: string; serial: string; cost: number; productId: string; }[]
) {
    const session = await auth();
    if (!session) throw new Error("No autorizado");

    await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
            supplierId,
            currency,
            exchangeRate,
            updatedAt: new Date()
        }
    });

    revalidatePath("/inventory/purchases");
}

export async function deletePurchase(purchaseId: string) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }

    try {
        await prisma.instance.deleteMany({
            where: { purchaseId }
        });

        await prisma.purchase.delete({
            where: { id: purchaseId }
        });

        revalidatePath("/inventory/purchases");
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export async function bulkCreatePurchase(formData: FormData) {
    const session = await auth();
    if (!session) return { success: false, errors: ["No autenticado"] };

    const file = formData.get("file") as File;
    if (!file) return { success: false, errors: ["No file uploaded"] };

    const text = await file.text();
    const rows = text.split(/\r?\n/).slice(1);

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Find or create Supplier "CARGA MASIVA"
    // Note: Supplier has unique NIT. "SYSTEM" might conflict if reused?
    // Let's use a dummy NIT for system.
    let supplier = await prisma.supplier.findFirst({ where: { name: "CARGA MASIVA" } });
    if (!supplier) {
        supplier = await prisma.supplier.create({
            data: {
                name: "CARGA MASIVA",
                contactName: "SYSTEM",
                nit: "999999999-SYSTEM"
            }
        });
    }

    const purchase = await prisma.purchase.create({
        data: {
            supplierId: supplier.id,
            attendant: session.user.name || "SYSTEM",
            totalCost: 0,
            status: "COMPLETED"
        }
    });

    for (const row of rows) {
        if (!row.trim()) continue;
        const cols = row.split(",");
        const upc = cols[0]?.trim();
        const sku = cols[1]?.trim();
        const qty = parseInt(cols[2]?.trim() || "0");
        const cost = parseFloat(cols[3]?.trim() || "0");

        if (!qty || qty <= 0) continue;

        const product = await prisma.product.findFirst({
            where: { OR: [{ sku: sku || undefined }, { upc: upc || undefined }] }
        });

        if (!product) {
            skipped++;
            continue;
        }

        const instancesData = Array.from({ length: qty }).map(() => ({
            productId: product.id,
            purchaseId: purchase.id,
            cost: cost,
            status: "AVAILABLE",
            serialNumber: "BULK-" + Math.random().toString(36).substr(2, 9).toUpperCase()
        }));

        // @ts-ignore
        await prisma.instance.createMany({ data: instancesData });
        processed += qty;
    }

    revalidatePath("/inventory");
    return { success: true, processedCount: processed, skippedCount: skipped, errors };
}
