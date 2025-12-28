-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "deliveryMethod" TEXT NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
