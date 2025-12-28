-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sequences_type_year_key" ON "sequences"("type", "year");
