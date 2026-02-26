import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { instances: true }
  })
  
  console.log("LAST 5 SALES IN DB:")
  sales.forEach(s => console.log(`ID: ${s.invoiceNumber}, Date: ${s.date}, Total: ${s.total}, Instances: ${s.instances.length}`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
