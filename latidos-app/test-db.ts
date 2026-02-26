import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const transactions = await prisma.transaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { account: true, toAccount: true }
  })
  console.log(JSON.stringify(transactions, null, 2))
}
main()
