const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: node scripts/seed-admin.js <email> <password>');
        process.exit(1);
    }

    console.log(`Creating Admin user: ${email}...`);

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE'
        },
        create: {
            email,
            name: 'Admin Latidos',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE'
        },
    });

    console.log(`User ${user.email} created/updated with ID: ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
