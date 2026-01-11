
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING CLEANUP ---');

    try {
        // Delete in order of dependency to avoid foreign key constraints

        console.log('Deleting Payments...');
        await prisma.payment.deleteMany({});

        console.log('Deleting Transactions...');
        await prisma.transaction.deleteMany({});

        console.log('Deleting Sale Audits...');
        await prisma.saleAudit.deleteMany({});

        console.log('Deleting Sales...');
        await prisma.sale.deleteMany({});

        console.log('Deleting Logistics Tasks...');
        await prisma.logisticsTask.deleteMany({});

        console.log('Deleting Instances (Inventory Items)...');
        await prisma.instance.deleteMany({});

        console.log('Deleting Purchases...');
        await prisma.purchase.deleteMany({});

        console.log('Deleting Stock Adjustments...');
        await prisma.stockAdjustment.deleteMany({});

        console.log('Deleting Products...');
        await prisma.product.deleteMany({});

        console.log('Deleting Price History...');
        await prisma.priceHistory.deleteMany({});

        console.log('Deleting Categories...');
        await prisma.category.deleteMany({});

        console.log('Deleting Suppliers...');
        await prisma.supplier.deleteMany({});

        console.log('Deleting Customers...');
        await prisma.customer.deleteMany({});

        console.log('Deleting Logistic Zones (except potentially defaults, but users create them usually)...');
        // Keeping logistic zones might be safe if they are generic, but usually they are org specific.
        // The query will delete all.
        await prisma.logisticZone.deleteMany({});

        console.log('--- CLEANUP COMPLETE ---');
        console.log('Users and Organizations were PRESERVED.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
