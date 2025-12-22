/*
  Warnings:

  - A unique constraint covering the columns `[receptionNumber]` on the table `purchases` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "receptionNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "purchases_receptionNumber_key" ON "purchases"("receptionNumber");
