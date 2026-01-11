-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "sector" TEXT;

-- AlterTable
ALTER TABLE "organization_profile" ADD COLUMN     "defaultDueDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "logistic_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Medellin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistic_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistic_zones_name_key" ON "logistic_zones"("name");
