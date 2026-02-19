const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Borrando datos transaccionales y de negocio...');
    console.log('ℹ️  Mantenimiento de Usuarios, Cuentas Bancarias, Perfiles y Organización intactos.');

    try {
        console.log('1️⃣  Auditorías y Logs...');
        await prisma.saleAudit.deleteMany();

        console.log('2️⃣  Transacciones Financieras...');
        await prisma.transaction.deleteMany();

        console.log('3️⃣  Pagos...');
        await prisma.payment.deleteMany();

        console.log('4️⃣  Instancias de Inventario...');
        await prisma.instance.deleteMany();

        console.log('4.5️⃣  Auditorías de Stock...');
        await prisma.stockAudit.deleteMany();

        console.log('5️⃣  Ajustes de Stock...');
        await prisma.stockAdjustment.deleteMany();

        console.log('6️⃣  Tareas Logísticas...');
        await prisma.logisticsTask.deleteMany();

        console.log('7️⃣  Historial de Precios...');
        await prisma.priceHistory.deleteMany();

        console.log('8️⃣  Ventas...');
        await prisma.sale.deleteMany();

        console.log('9️⃣  Compras...');
        await prisma.purchase.deleteMany();

        console.log('🔟  Productos...');
        await prisma.product.deleteMany();

        console.log('1️⃣1️⃣ Categorías...');
        await prisma.category.deleteMany();

        console.log('1️⃣2️⃣ Clientes...');
        await prisma.customer.deleteMany();

        console.log('1️⃣3️⃣ Proveedores...');
        await prisma.supplier.deleteMany();

        console.log('1️⃣4️⃣ Zonas Logísticas...');
        await prisma.logisticZone.deleteMany();

        console.log('1️⃣5️⃣ Secuenciadores (Reinicio de numeración de facturas)...');
        await prisma.sequence.deleteMany();

        console.log('✅ ¡Borrador completado con éxito! La organización está lista para la migración limpia.');
    } catch (error) {
        console.error('❌ Error durante el borrado:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
