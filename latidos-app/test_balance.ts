import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const result = await prisma.customer.findMany({
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, creditBalance: true, updatedAt: true },
        take: 5
    })
    console.log("Recent customers:", JSON.stringify(result, null, 2))

    const debt = await prisma.customer.findMany({
        where: { creditBalance: { gt: 0 } },
        select: { id: true, name: true, creditBalance: true, updatedAt: true }
    })
    console.log("Customers with actual debt:", JSON.stringify(debt, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
