const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const productCount = await prisma.product.count();
    const saleCount = await prisma.sale.count();
    const customerCount = await prisma.customer.count();
    const userCount = await prisma.user.count();

    console.log(`Products: ${productCount}`);
    console.log(`Sales: ${saleCount}`);
    console.log(`Customers: ${customerCount}`);
    console.log(`Users: ${userCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
