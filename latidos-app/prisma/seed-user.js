const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await hash('admin123', 10);
    const pinHash = await hash('0000', 10);

    // database was just wiped, so we can verify if user exists or just create.
    // Since unique constraint is [email, organizationId], and we are creating root admin (orgId=null),
    // upsert might fail if unique index doesn't handle nulls strictly or if we don't target the compound.
    // For a clean seed, create is safer.

    const admin = await prisma.user.create({
        data: {
            name: 'Administrador',
            email: 'admin@latidos.com',
            password: passwordHash,
            securityPin: pinHash,
            role: 'ADMIN',
            permissions: {
                canEditSales: true,
                canViewCosts: true,
                canManageInventory: true,
                canManageTeam: true
            }
        },
    });

    console.log({ admin });
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
