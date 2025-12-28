-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "logistics_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "moneyToCollect" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_tasks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "logistics_tasks" ADD CONSTRAINT "logistics_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_tasks" ADD CONSTRAINT "logistics_tasks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
