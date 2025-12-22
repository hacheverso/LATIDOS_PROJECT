-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "originalCost" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN     "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1;
