const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await hash('admin123', 10);

    const user = await prisma.user.update({
        where: { email: 'admin@latidos.com' },
        data: { password: passwordHash }
    });

    console.log("Admin password reset successfully for:", user.email);
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
