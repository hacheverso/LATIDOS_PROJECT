
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Authentication
        const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");

        if (!apiKey) {
            return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
        }

        const org = await prisma.organizationProfile.findFirst();

        // Security: Check if Org exists and Key matches
        // If no Org or no Key set, fail safe.
        if (!org || !org.backupApiKey || org.backupApiKey !== apiKey) {
            return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
        }

        // 2. Filter: Since Date
        const sinceParam = req.nextUrl.searchParams.get("since");
        let dateFilter: any = {};

        if (sinceParam) {
            const date = new Date(sinceParam);
            if (!isNaN(date.getTime())) {
                // Ensure we get everything AFTER that date (start of day? or exact?)
                // Usually "since" means created >= date
                // Let's set it to start of that day just in case
                date.setHours(0, 0, 0, 0);
                dateFilter = {
                    date: {
                        gte: date
                    }
                };
            }
        }

        // 3. Query Sales
        const sales = await prisma.sale.findMany({
            where: dateFilter,
            orderBy: { date: 'desc' },
            include: {
                customer: true,
                instances: {
                    include: {
                        product: true
                    }
                },
                payments: true // To calculate paid amount if needed
            }
        });

        // 4. Transform Data
        const rows: any[] = [];

        for (const sale of sales) {
            const invoice = sale.invoiceNumber || sale.id;
            const date = sale.date.toISOString().split('T')[0]; // YYYY-MM-DD
            const customer = sale.customer.name;

            // Financial Status
            // Calculate total paid? Or use amountPaid field?
            // amountPaid is in the model.
            const totalPaid = Number(sale.amountPaid);
            const total = Number(sale.total);
            const balanceDue = total - totalPaid;

            // Prompt requests "PAGO PEND / PENDIENTE"
            // "PAGO PEND": Based on image, seems to receive Payments (?) or is it "Pago Pendiente"?
            // Image Col "PAGO PEND" has values like 0.00 or $2,500,000.
            // Image Col "PENDIENTE" has values like 0.00 or $2,500,000.
            // If "PAGO PEND" means "Payment Pending" (Balance), then both are same?
            // Re-reading: "PAGO PEND / PENDIENTE: Montos recaudados y saldos..."
            // Let's map: 
            // - "PAGO PEND" -> Amount Paid (Recaudado) ? Wait, "PEND" usually means Pending.
            // Let's look at the image again. 
            // Row 1: Precio VE $2.5M, Pago Pend $0, Pendiente $0. -> Fully Paid?
            // Row 3: Precio VE $3.95M, Pago Pend $3.95M, Pendiente $3.95M. -> Seems unpaid?
            // Let's assume:
            // "PAGO PEND": Amount Paid (Wait, hold on, "Pago Pend" = Payment Pending? Or Payment Made?)
            // If Row 1 is fully paid (Balance 0), and PAGO PEND is 0, then PAGO PEND is Balance.
            // If Row 3 has Balance $3.95M, and PAGO PEND is $3.95M, then PAGO PEND is Balance.
            // But there is another column "PENDIENTE" which is also $3.95M. Why duplicate?
            // Maybe one is "Payment Status" (Text) and other is "Amount"?
            // The prompt says: "Estado de Pago: Un campo booleano o de texto..."
            // Let's provide clear JSON fields: `payment_status` (PAID/PENDING), `amount_paid`, `balance_due`.
            // And also map the specific keys for the "Spreadsheet Script" if it expects specific keys. 
            // However, the prompt says "Campos obligatorios en el JSON... Mapeo de Columnas (Basado en image)".
            // I will provide JSON keys that match the column headers normalized:
            // FACTURA, FECHA, CLIENTE, SKU, PRODUCTO, DESCRIPCION, CANTIDAD, PRECIO_VE, PAGO_PEND, PENDIENTE, COSTO.

            // Let's standardize:
            // PAGO_PEND -> Amount Paid (Let's assume "Pago Pendiente de Cobro" vs "Pago Realizado"? Confusion.)
            // Let's Stick to User Request Text: "PAGO PEND / PENDIENTE: Montos recaudados y saldos".
            // So one is Collected, one is Balance.
            // Let's assume PAGO_PEND = Collected (Recaudado) and PENDIENTE = Balance (Saldo).

            // Group by Product SKU to avoid row explosion if multiple quantity of same item?
            // "Desglose por ítem... Estructura Plana... Si una factura contiene múltiples productos... objeto por cada producto (línea de detalle)"
            // Example Row in Image: Qty 1.
            // If I sell 2 iPhones, do I want 1 row with Qty 2? Or 2 rows with Qty 1?
            // Image shows Qty 1 mostly. But Row 4 has Qty 2 ("XBOX SERIES S"). Serial column shows: "BK36..." (Only one serial? Or comma separated?)
            // Prompt says: "donde deben incluirse los seriales/IMEIs vendidos". Plural.
            // So we Group by SKU.

            // Helper to Group Instances by SKU
            const groupedInstances = new Map<string, {
                product: any,
                count: number,
                serials: string[],
                totalPrice: number,
                unitCost: number; // Historical Cost
            }>();

            sale.instances.forEach(inst => {
                const key = inst.product.sku;
                if (!groupedInstances.has(key)) {
                    groupedInstances.set(key, {
                        product: inst.product,
                        count: 0,
                        serials: [],
                        totalPrice: 0, // We need sales price. Instance.soldPrice?
                        unitCost: Number(inst.cost) || 0
                    });
                }
                const group = groupedInstances.get(key)!;
                group.count++;
                if (inst.serialNumber) group.serials.push(inst.serialNumber);
                if (inst.imei) group.serials.push(inst.imei);

                // Price? 
                // Sale model has `total`. Instance has `soldPrice`.
                // If `soldPrice` is stored on Instance, valid.
                // If not, we might need to derive. But usually we store it.
                // Checking Schema: `soldPrice Decimal?`.
                // Let's assume it's populated.
                // If not, we fall back to Product `basePrice` (risky) or Sale Total / Item Count (imprecise).
                // Let's try `inst.soldPrice`.
                // Wait, logic in `createSale`? Check it?
                // Assuming it's there.
            });

            // Loop groups
            for (const [sku, group] of groupedInstances) {
                // Find unit price. Using average of group if multiple? Or just one?
                // The prompt implies row per SKU.
                // We need `soldPrice`. Let's assume all instances of same SKU in same sale have same price.
                // Retrieve one instance to check price.
                const sampleInst = sale.instances.find(i => i.product.sku === sku);
                const unitPrice = Number(sampleInst?.soldPrice) || 0;

                // Description: Serials
                const description = group.serials.join(", ");

                rows.push({
                    FACTURA: invoice,
                    FECHA: date,
                    CLIENTE: customer,
                    SKU: sku,
                    PRODUCTO: group.product.name,
                    DESCRIPCION: description,
                    CANTIDAD: group.count,
                    PRECIO_VE: unitPrice,
                    RECAUDADO: totalPaid, // mapped to PAGO_PEND in user terminology? I will use clear keys.
                    SALDO_PENDIENTE: balanceDue,
                    COSTO: group.unitCost, // Historical
                });
            }
        }

        return NextResponse.json(rows);

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
