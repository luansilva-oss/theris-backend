-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- AlterTable: add unitId to Department (nullable first for backfill)
ALTER TABLE "Department" ADD COLUMN "unitId" TEXT;

-- Backfill: create default Unit for existing departments (only if table is empty)
INSERT INTO "Unit" ("id", "name", "createdAt")
SELECT gen_random_uuid()::text, '3C+', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Unit" LIMIT 1);

UPDATE "Department" SET "unitId" = (SELECT "id" FROM "Unit" LIMIT 1) WHERE "unitId" IS NULL;

-- AlterTable: make unitId required and add FK
ALTER TABLE "Department" ALTER COLUMN "unitId" SET NOT NULL;

-- DropIndex (Department.name was @unique)
DROP INDEX IF EXISTS "Department_name_key";

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: unique (unitId, name) per unit
CREATE UNIQUE INDEX "Department_unitId_name_key" ON "Department"("unitId", "name");
