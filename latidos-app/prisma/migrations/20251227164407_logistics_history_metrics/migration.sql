-- AlterTable
ALTER TABLE "logistics_tasks" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "onRouteAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "onRouteAt" TIMESTAMP(3);
