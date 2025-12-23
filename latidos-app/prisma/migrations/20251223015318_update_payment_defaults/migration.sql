-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'EFECTIVO';

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "paymentMethod" SET DEFAULT 'EFECTIVO';
