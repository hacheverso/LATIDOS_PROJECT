import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            organizationId: true,
            status: true
        }
    })

    console.log('--- USER DATA INTEGRITY CHECK ---')
    users.forEach(u => {
        console.log(`[${u.role}] ${u.email}: OrgId=${u.organizationId}, Status=${u.status}`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
