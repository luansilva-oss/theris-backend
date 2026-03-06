-- AlterTable
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "accessPeriodDays" INTEGER,
ADD COLUMN IF NOT EXISTS "accessPeriodRaw" TEXT;
