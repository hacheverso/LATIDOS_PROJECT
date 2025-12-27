const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await hash('admin123', 10);
    const pinHash = await hash('0000', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@latidos.com' },
        update: {},
        create: {
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
