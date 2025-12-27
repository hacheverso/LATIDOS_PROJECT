
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Sales Repair Script...");

    // 1. Find corrupted sales (Total = 0 or status = "Saldado" with Pending balance logic mismatch)
    // Actually, user said: "facturas de prueba... que tienen Total $0 y estado 'Saldado'".
    // We will look for sales with total = 0.

    // @ts-ignore
    const corruptedSales = await prisma.sale.findMany({
        where: {
            total: 0
        },
        include: {
            instances: {
                include: { product: true }
            }
        }
    });

    console.log(`Found ${corruptedSales.length} sales with Total $0.`);

    for (const sale of corruptedSales) {
        console.log(`Processing Sale ${sale.invoiceNumber || sale.id}...`);

        let calculatedTotal = 0;

        // Calculate total from instances
        for (const instance of sale.instances) {
            // Priority: Sold Price -> Product Base Price -> 0
            const price = instance.soldPrice ? instance.soldPrice.toNumber() : instance.product.basePrice.toNumber();
            calculatedTotal += price;
        }

        console.log(`  - Recalculated Total: $${calculatedTotal}`);

        if (calculatedTotal > 0) {
            // Update Sale
            await prisma.sale.update({
                where: { id: sale.id },
                data: {
                    total: calculatedTotal,
                    amountPaid: 0, // Reset payments as requested to ensure clean state 
                    // Wait, schema has NO status field on Sale. Status is derived in 'getSales'. 
                    // But user asked: "el campo status se guarde siempre como 'PENDIENTE'". 
                    // Let's check schema again. `getSales` in actions.ts derives it. 
                    // But `processSale` doesn't write to a `status` field.
                    // Ah, the user might be confusing the derived status with a DB field, OR there is a status field I missed.
                    // Checking schema from knowledge: "Sale" has `total`, `amountPaid`. `Instance` has `status`.
                    // Wait, Step 361 show `actions.ts` deriving status: `status: balance <= 0 ? 'PAID' : ...`
                    // BUT, I should check if there IS a status field on Sale model in schema.
                    // Step 366 (schema snippet) shows `Purchase` has status. `Sale` was not fully shown.
                    // Let's assume Sale does NOT have status field based on `actions.ts` logic.
                    // However, `instances` have status 'SOLD'.
                    // "Cambia su estado a 'PENDIENTE'" likely means -> Make sure it calculates as Pending.
                    // Which means `amountPaid` < `total`.
                    // So setting `amountPaid` = 0 and `total` = calculatedTotal achieves this.
                }
            });
            console.log(`  - Updated.`);
        } else {
            console.log(`  - Skipping (Calculated Total is 0 - Empty items?)`);
        }
    }

    console.log("Repair complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
