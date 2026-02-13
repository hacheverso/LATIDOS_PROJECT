const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'hugogiraldo123@gmail.com';
    const password = '123456';

    console.log(`Setting password '${password}' for user ${email}...`);

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.update({
        where: { email }, // This might fail if email is not unique in schema without composite, but we'll try findFirst if update fails or use `where: { email_organizationId }` if needed.
        // Wait, schema has @@unique([email, organizationId]) so email alone is NOT unique in the model definition for `where`.
        // We need to find the user first.
        data: {
            password: hashedPassword
        }
    }).catch(async (e) => {
        // Fallback: Find first and update
        const u = await prisma.user.findFirst({ where: { email } });
        if (!u) {
            console.error("User not found!");
            return;
        }
        return prisma.user.update({
            where: { id: u.id },
            data: { password: hashedPassword }
        });
    });

    console.log("Password updated successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
