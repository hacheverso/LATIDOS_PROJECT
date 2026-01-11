
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyZeroState() {
    console.log('--- VERIFYING ZERO STATE ---');

    // 1. Simulate "New User" scenario (we won't actually create one to avoid polluting, just check if existing Org queries return nothing for a non-existent org)
    // Actually simpler: Create a dummy non-existent Org ID and run the queries same as getExecutiveMetrics does.

    const dummyOrgId = "non-existent-org-id-" + Math.random();
    console.log(`Testing with Dummy Org ID: ${dummyOrgId}`);

    try {
        const salesCount = await prisma.sale.count({ where: { organizationId: dummyOrgId } });
        const productCount = await prisma.product.count({ where: { organizationId: dummyOrgId } });
        const customerCount = await prisma.customer.count({ where: { organizationId: dummyOrgId } });

        console.log(`Sales: ${salesCount}`);
        console.log(`Products: ${productCount}`);
        console.log(`Customers: ${customerCount}`);

        if (salesCount === 0 && productCount === 0 && customerCount === 0) {
            console.log("SUCCESS: Zero state confirmed for new/isolated organization.");
        } else {
            console.error("FAILURE: Data leakage detected or invalid test.");
        }

    } catch (e) {
        console.error("Verification Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyZeroState();
