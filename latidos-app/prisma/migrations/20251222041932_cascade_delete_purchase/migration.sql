-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "serialNumber" TEXT,
    "imei" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "cost" DECIMAL,
    "location" TEXT,
    "saleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "instances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "instances_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "instances_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_instances" ("condition", "cost", "createdAt", "id", "imei", "location", "productId", "purchaseId", "saleId", "serialNumber", "status", "updatedAt") SELECT "condition", "cost", "createdAt", "id", "imei", "location", "productId", "purchaseId", "saleId", "serialNumber", "status", "updatedAt" FROM "instances";
DROP TABLE "instances";
ALTER TABLE "new_instances" RENAME TO "instances";
CREATE UNIQUE INDEX "instances_serialNumber_key" ON "instances"("serialNumber");
CREATE UNIQUE INDEX "instances_imei_key" ON "instances"("imei");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
