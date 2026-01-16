
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting Total Database Cleanup (JS Mode)...');
    console.log('⚠️  WARNING: This will delete ALL data including Organizations and Users.');

    try {
        // 1. Audit & Logs (Leaves)
        console.log('1️⃣  Deleting Audits & Logs...');
        await prisma.saleAudit.deleteMany();

        // 2. Financials (Transactions depend on Payments/Accounts)
        console.log('2️⃣  Deleting Financial Transactions...');
        await prisma.transaction.deleteMany();

        // 3. Payments (Depend on Sales)
        console.log('3️⃣  Deleting Payments...');
        await prisma.payment.deleteMany();

        // 4. Inventory Instances (Center of the universe)
        console.log('4️⃣  Deleting Inventory Instances...');
        await prisma.instance.deleteMany();

        // 5. Stock Adjustments
        console.log('5️⃣  Deleting Stock Adjustments...');
        await prisma.stockAdjustment.deleteMany();

        // 6. Logistics Tasks
        console.log('6️⃣  Deleting Logistics Tasks...');
        await prisma.logisticsTask.deleteMany();

        // 7. Price History
        console.log('7️⃣  Deleting Price History...');
        await prisma.priceHistory.deleteMany();

        // 8. Sales (Depend on Customer, User, Org)
        console.log('8️⃣  Deleting Sales...');
        await prisma.sale.deleteMany();

        // 9. Purchases (Depend on Supplier, Org)
        console.log('9️⃣  Deleting Purchases...');
        await prisma.purchase.deleteMany();

        // 10. Products (Depend on Category, Org)
        console.log('🔟 Deleting Products...');
        await prisma.product.deleteMany();

        // 11. Categories
        console.log('1️⃣1️⃣ Deleting Categories...');
        await prisma.category.deleteMany();

        // 12. Customers
        console.log('1️⃣2️⃣ Deleting Customers...');
        await prisma.customer.deleteMany();

        // 13. Suppliers
        console.log('1️⃣3️⃣ Deleting Suppliers...');
        await prisma.supplier.deleteMany();

        // 14. Logistic Zones
        console.log('1️⃣4️⃣ Deleting Logistic Zones...');
        await prisma.logisticZone.deleteMany();

        // 15. Sequences
        console.log('1️⃣5️⃣ Deleting Sequences...');
        await prisma.sequence.deleteMany();

        // 16. Auth Accounts (NextAuth)
        console.log('1️⃣6️⃣ Deleting Auth Accounts...');
        await prisma.account.deleteMany();

        // 17. Users (Staff/Admins)
        console.log('1️⃣7️⃣ Deleting Users...');
        await prisma.user.deleteMany();

        // 18. Payment Accounts
        console.log('1️⃣8️⃣ Deleting Payment Accounts...');
        await prisma.paymentAccount.deleteMany();

        // 19. Organization Profile
        console.log('1️⃣9️⃣ Deleting Organization Profile...');
        await prisma.organizationProfile.deleteMany();

        // 20. Organizations (Root)
        console.log('2️⃣0️⃣ Deleting Organizations...');
        await prisma.organization.deleteMany();

        console.log('✅ Database Cleanup Complete! The system is now a blank slate.');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
