"use server";

import * as fs from 'fs';
import * as path from 'path';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

// const prisma = new PrismaClient(); // Removed in favor of singleton

export async function createProduct(formData: FormData) {
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const condition = formData.get("condition") as string; // Maps to schema 'state' maybe? Or keeps separate? Schema has 'state', form has 'condition'.
    // User requested 'state' in schema. Form sends 'condition'. Let's map it.
    const state = condition === "NEW" ? "Nuevo" : condition === "OPEN_BOX" ? "Open Box" : "Usado";

    const upc = formData.get("upc") as string;
    const sku = formData.get("sku") as string; // Auto-generated or passed
    const imageUrl = formData.get("imageUrl") as string || null;

    if (!name || !sku || !upc || !category) {
        throw new Error("Faltan campos obligatorios");
    }

    try {
        await prisma.product.create({
            data: {
                name,
                category,
                state, // Mapped from condition
                upc,
                sku,
                imageUrl
            }
        });
    } catch (e) {
        // eslint-disable-next-line
        if ((e as any).code === 'P2002') {
            // Unique constraint violation (SKU or UPC)
            throw new Error("El SKU o UPC ya existe.");
        }
        throw new Error("Error al crear el producto: " + (e instanceof Error ? e.message : String(e)));
    }

    revalidatePath("/inventory");
    redirect("/inventory");
}

export async function updateProduct(id: string, data: { name: string; basePrice: number; imageUrl?: string; category: string }) {
    try {
        await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                basePrice: data.basePrice,
                imageUrl: data.imageUrl,
                category: data.category,
            }
        });
        revalidatePath("/inventory");
        revalidatePath(`/inventory/${id}`);
    } catch (e) {
        throw new Error("Error al actualizar producto: " + (e instanceof Error ? e.message : String(e)));
    }
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

export async function createPurchase(itemData: { sku: string; serial: string; cost: number; productId: string; }[]) {
    if (itemData.length === 0) throw new Error("No hay items para registrar.");

    // 1. Ensure Generic Supplier
    let supplier = await prisma.supplier.findFirst({ where: { name: "PROVEEDOR GENERAL" } });
    if (!supplier) {
        supplier = await prisma.supplier.create({
            data: {
                name: "PROVEEDOR GENERAL",
                nit: "000000000",
                phone: "000",
            }
        });
    }

    const totalCost = itemData.reduce((acc, item) => acc + item.cost, 0);

    // 2. Create Purchase Header
    const purchase = await prisma.purchase.create({
        data: {
            supplierId: supplier.id,
            totalCost,
            status: "COMPLETED",
            notes: "Ingreso Manual desde Recepción Inteligente",
        }
    });

    // 3. Create Instances
    for (const item of itemData) {
        await prisma.instance.create({
            data: {
                productId: item.productId,
                purchaseId: purchase.id,
                serialNumber: item.serial,
                cost: item.cost,
                status: "IN_STOCK",
                condition: "NEW", // Defaulting to NEW for now
            }
        });
    }

    revalidatePath("/inventory");
    revalidatePath("/inventory");
    // Redirect to inventory list as purchases list page is not yet implemented
    redirect("/inventory");
}

export async function getSuppliers() {
    const suppliers = await prisma.supplier.findMany({
        orderBy: { name: 'asc' }
    });
    return suppliers;
}

export async function getCategories() {
    // Fetch unique categories
    const categories = await prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' }
    });
    return categories.map(c => c.category);
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
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

        // Dynamic Mapping Helper
        const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        // Define priority keywords for each field
        const idxUPC = getIndex(["upc", "code", "código"]);
        const idxSKU = getIndex(["sku", "ref"]);
        const idxName = getIndex(["name", "nombre", "producto"]);
        const idxCategory = getIndex(["cat", "categoría"]); // Optional
        const idxState = getIndex(["est", "state", "cond"]); // Optional
        const idxPrice = getIndex(["precio", "price", "venta"]);
        const idxImage = getIndex(["img", "foto", "url", "image"]);

        const parseCurrency = (val: string | undefined) => {
            if (!val) return 0;
            if (val.toUpperCase().includes("NO VENDIDO")) return 0;
            // Robust cleanup: remove $, #, whitespace
            let clean = val.replace(/[$\s#]/g, "");

            // Assume Dot = Thousands (CO Format): 1.000.000 -> 1000000
            clean = clean.replace(/\./g, "");
            // Assume Comma = Decimal: 10,50 -> 10.50
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
                const category = idxCategory !== -1 ? clean(cols[idxCategory]) : "GENERAL";
                const state = idxState !== -1 ? clean(cols[idxState]) : "Nuevo";
                const price = idxPrice !== -1 ? parseCurrency(cols[idxPrice]) : 0;
                const imageUrl = idxImage !== -1 ? clean(cols[idxImage]) : null;

                // Fallbacks logic
                if (!upc && !name) {
                    if (cols[0] && /^\d+$/.test(clean(cols[0]))) {
                        upc = clean(cols[0]);
                        sku = clean(cols[1]);
                    }
                }

                if (!name && !upc) continue;

                if (!name && cols.length > 2 && idxName === -1) {
                    // Check if simple legacy potentially?
                }

                if (!name || !upc) continue;

                if (!sku) {
                    sku = `${name.substring(0, 3).toUpperCase()}-${upc.substring(upc.length - 4)}`.replace(/\s+/g, '');
                }
                // --- MAPPING LOGIC END ---

                // Upsert
                const existing = await prisma.product.findUnique({ where: { upc } });

                if (existing) {
                    await prisma.product.update({
                        where: { id: existing.id },
                        data: {
                            name,
                            category,
                            imageUrl: imageUrl || existing.imageUrl,
                            basePrice: price > 0 ? price : existing.basePrice
                        }
                    });
                } else {
                    await prisma.product.create({
                        data: {
                            name,
                            category,
                            state,
                            upc,
                            sku,
                            imageUrl,
                            basePrice: price > 0 ? price : 0
                        }
                    });
                }
                processedCount++;
            } catch (e) {
                console.error(e);
                errors.push(`Fila ${i + 1}: Error al procesar`);
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
            count: processedCount,
            errors,
            message: `Saldo cargado. ${debugMsg || ""} (${processedCount} unidades).`
        };
    } catch (e) {
        // eslint-disable-next-line
        log(`CRITICAL ERROR: ${(e as Error).message}`);
        console.error("CRITICAL BALANCE ERROR:", e);
        return { success: false, errors: ["Error crítico en carga de saldo: " + (e as Error).message] };
    }
}

export async function deletePurchase(purchaseId: string) {
    try {
        // 0. Safety Check: Ensure no items from this purchase have been sold
        const soldItemsParams = {
            where: {
                purchaseId,
                OR: [
                    { status: "SOLD" },
                    { saleId: { not: null } }
                ]
            }
        };

        const soldCount = await prisma.instance.count(soldItemsParams);

        if (soldCount > 0) {
            return {
                success: false,
                error: `No se puede eliminar: ${soldCount} unidad(es) ya han sido vendidas.`
            };
        }

        // 1. Delete associated instances (Stock Reversion) - Handled by Cascade in Schema mostly, but explicit delete is fine too if we didn't migrate yet, but we did. 
        // Actually since we rely on Cascade now, we CAN just delete the purchase.
        // However, explicit delete is safer if migration didn't apply perfectly or simply to be explicit.
        // But let's trust Cascade for cleanup, validation is the key part.

        // 2. Delete the purchase record
        await prisma.purchase.delete({
            where: { id: purchaseId }
        });

        revalidatePath("/inventory");
        revalidatePath("/inventory/purchases");
        return { success: true };
    } catch (e) {
        console.error("Error deleting purchase:", e);
        return {
            success: false,
            error: "Error interno al eliminar la compra."
        };
    }
}

export async function bulkDeleteProducts(productIds: string[]) {
    try {
        if (!productIds || productIds.length === 0) {
            return { success: false, error: "No se seleccionaron productos." };
        }

        await prisma.product.deleteMany({
            where: {
                id: { in: productIds }
            }
        });

        revalidatePath("/inventory");
        return { success: true };
    } catch (e) {
        console.error("Error deleting products:", e);
        return { success: false, error: "Error al eliminar productos seleccionados." };
    }
}

export async function bulkCreatePurchase(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha subido ningún archivo.");

    const text = await file.text();
    const rows = text.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    const errors: string[] = [];
    let processedCount = 0;
    let totalCost = 0;
    let skippedCount = 0;

    // Detect Key: Check header or first row for semicolon
    const separator = rows[0].includes(";") ? ";" : ",";

    // Helper to split ensuring we don't split inside quotes
    const splitRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

    // 1. Ensure Generic Supplier
    let supplier = await prisma.supplier.findFirst({ where: { name: "PROVEEDOR GENERAL" } });
    if (!supplier) {
        supplier = await prisma.supplier.create({
            data: { name: "PROVEEDOR GENERAL", nit: "000000000", phone: "000" }
        });
    }

    // 2. Create Purchase Header
    const purchase = await prisma.purchase.create({
        data: {
            supplierId: supplier.id,
            totalCost: 0,
            status: "COMPLETED",
            notes: "IMPORTACIÓN MASIVA",
        }
    });

    // 3. Process Rows (Skip Header)
    for (let i = 1; i < rows.length; i++) {
        try {
            const cols = rows[i].split(splitRegex);
            const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

            // Expected: upc, sku, cantidad, costo_unitario
            const upc = cleanCols[0];
            const sku = cleanCols[1];
            const quantity = parseInt(cleanCols[2]) || 0;
            const unitCost = parseFloat(cleanCols[3].replace(",", ".")) || 0;

            if (quantity <= 0) continue;

            // Find Product strategy: UPC first, then SKU
            let product = null;
            if (upc) product = await prisma.product.findUnique({ where: { upc } });
            if (!product && sku) product = await prisma.product.findFirst({ where: { sku } });

            if (!product) {
                // SKIP UNKNOWN PRODUCTS
                skippedCount++;
                continue;
            }

            // Create Instances
            const instancesData = Array(quantity).fill(null).map(() => ({
                productId: product.id,
                purchaseId: purchase.id,
                status: "IN_STOCK",
                condition: "NEW",
                cost: unitCost,
                serialNumber: null
            }));

            await prisma.instance.createMany({ data: instancesData });

            processedCount += quantity;
            totalCost += (unitCost * quantity);

        } catch (e) {
            console.error(e);
            errors.push(`Fila ${i + 1}: Error procesando fila.`);
        }
    }

    // Update total cost
    await prisma.purchase.update({
        where: { id: purchase.id },
        data: { totalCost }
    });

    revalidatePath("/inventory");
    return { success: true, processedCount, skippedCount, errors };
}

export async function getProductIntelligence(productId: string) {
    const NOW = new Date();
    const THIRTY_DAYS_AGO = new Date(NOW.getTime() - (30 * 24 * 60 * 60 * 1000));

    // 1. Fetch Product with current stock and sales
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            instances: {
                where: {
                    status: "IN_STOCK"
                },
                orderBy: { createdAt: 'asc' } // Oldest first
            },
            priceHistory: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    if (!product) throw new Error("Producto no encontrado");

    // 2. Calculate Sales Velocity (Last 30 days)
    const salesCount = await prisma.instance.count({
        where: {
            productId: productId,
            status: "SOLD",
            sale: {
                date: {
                    gte: THIRTY_DAYS_AGO
                }
            }
        }
    });

    const weeklyVelocity = Number((salesCount / 4).toFixed(1)); // Avg per week

    // 3. Days in Inventory (Oldest Unit)
    let daysInInventory = 0;
    if (product.instances.length > 0) {
        const oldestDate = new Date(product.instances[0].createdAt);
        daysInInventory = Math.floor((NOW.getTime() - oldestDate.getTime()) / (1000 * 3600 * 24));
    }

    // 4. Average Cost
    // We only calc avg cost of CURRENT IN STOCK items to know margin on stock at hand
    const totalCost = product.instances.reduce((acc, i) => acc + (Number(i.cost) || 0), 0);
    const avgCost = product.instances.length > 0 ? totalCost / product.instances.length : 0;

    // 5. Margin
    const currentPrice = Number(product.basePrice);
    const margin = currentPrice - avgCost;
    const marginPercent = currentPrice > 0 ? (margin / currentPrice) * 100 : 0;

    // 6. Suggestion Logic
    let suggestion = null;
    let alertLevel: "normal" | "warning" | "critical" = "normal";

    if (daysInInventory > 60) {
        alertLevel = "critical";
        suggestion = "El inventario está estancado (>60 días). Sugerimos una liquidación agresiva (-15%).";
    } else if (daysInInventory > 30) {
        alertLevel = "warning";
        suggestion = "Rotación lenta (>30 días). Considera bajar el precio un 5% para reactivar ventas.";
    } else if (product.instances.length > 10 && weeklyVelocity < 1) {
        alertLevel = "warning";
        suggestion = "Stock alto con baja velocidad. Revisa la visibilidad del producto.";
    } else if (marginPercent < 10 && avgCost > 0) {
        alertLevel = "warning";
        suggestion = "Margen peligroso (<10%). Verifica si el costo ha subido.";
    }

    return {
        stockCount: product.instances.length,
        daysInInventory,
        weeklyVelocity,
        avgCost,
        currentPrice,
        margin,
        marginPercent,
        suggestion,
        alertLevel,
        lastPriceChange: product.priceHistory[0]?.createdAt
    };
}
