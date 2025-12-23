import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCategories() {
    console.log("Starting Category Migration...");

    // 1. Get all products with a legacy string category and no categoryId
    const products = await prisma.product.findMany({
        where: {
            AND: [
                { category: { not: null } },
                { category: { not: "" } },
                { categoryId: null }
            ]
        },
        select: { id: true, category: true, name: true }
    });

    console.log(`Found ${products.length} products to migrate.`);
    if (products.length === 0) {
        console.log("Nothing to migrate.");
        return;
    }

    // 2. Identify unique categories
    const categoryNames = new Set<string>();
    products.forEach(p => {
        if (p.category) categoryNames.add(p.category.trim());
    });

    console.log(`Unique categories found: ${Array.from(categoryNames).join(", ")}`);

    // 3. Create Categories and Map IDs
    const categoryMap = new Map<string, string>();

    for (const name of Array.from(categoryNames)) {
        // Check if exists (case insensitive?)
        // Let's rely on name/slug uniqueness or just findFirstByName
        let cat = await prisma.category.findUnique({ where: { name } });

        if (!cat) {
            console.log(`Creating new category: ${name}`);
            cat = await prisma.category.create({
                data: { name: name, slug: name.toLowerCase().replace(/\s+/g, '-') }
            });
        }
        categoryMap.set(name, cat.id);
    }

    // 4. Update Products
    let updatedCount = 0;
    for (const product of products) {
        if (!product.category) continue;
        const catId = categoryMap.get(product.category.trim());

        if (catId) {
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    categoryId: catId,
                    category: null // Clear legacy field
                }
            });
            updatedCount++;
        }
    }

    console.log(`Migration Complete. Updated ${updatedCount} products.`);
}

migrateCategories()
    .catch(e => {
        console.error("Migration Error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
