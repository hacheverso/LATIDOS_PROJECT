const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error("No admin found. Run seed-user.js first.");

    console.log("Restoring Sample Data for Owner:", admin.name);

    // 1. Restore/Ensure Category
    const cat = await prisma.category.upsert({
        where: { name: 'Apple Audio' }, // Use name as unique identifier
        update: {},
        create: {
            name: 'Apple Audio',
            slug: 'apple-audio'
        }
    });

    // 2. Restore Products
    const products = [
        { name: 'AirPods Pro 2', upc: '194253397168', sku: 'AUDIO-APP-001', price: 249000 },
        { name: 'AirPods 4', upc: '195949052009', sku: 'AUDIO-APP-002', price: 179000 }
    ];

    for (const p of products) {
        const product = await prisma.product.upsert({
            where: { upc: p.upc },
            update: {},
            create: {
                name: p.name,
                upc: p.upc,
                sku: p.sku,
                basePrice: p.price,
                categoryId: cat.id
            }
        });

        // Create Stock
        await prisma.instance.createMany({
            data: Array(5).fill(0).map(() => ({
                productId: product.id,
                status: "IN_STOCK",
                condition: "NEW",
                cost: p.price * 0.7,
                serialNumber: null // General stock
            }))
        });
    }

    // 3. Create Sample Sale for Admin
    const product = await prisma.product.findUnique({ where: { upc: '194253397168' } });

    // Create Customer
    const customer = await prisma.customer.create({
        data: {
            name: "Cliente Restaurado",
            taxId: "999999999",
            email: "test@restore.com"
        }
    });

    // Create Sale
    const sale = await prisma.sale.create({
        data: {
            customerId: customer.id,
            total: product.basePrice,
            paymentMethod: 'EFECTIVO',
            // Explicitly link via Audit to show "ownership" if we filter by it
            // Although our current view shows ALL sales.
            audits: {
                create: {
                    userId: admin.id,
                    userName: admin.name,
                    reason: 'Importación de Datos Históricos',
                    changes: {}
                }
            }
        }
    });

    console.log("Data Restored!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
