-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "basePrice" DECIMAL NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'Nuevo',
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("category", "createdAt", "id", "imageUrl", "name", "sku", "state", "upc", "updatedAt") SELECT "category", "createdAt", "id", "imageUrl", "name", "sku", "state", "upc", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "products_upc_key" ON "products"("upc");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
