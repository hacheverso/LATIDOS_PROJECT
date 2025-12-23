/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "soldPrice" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoiceNumber_key" ON "sales"("invoiceNumber");
