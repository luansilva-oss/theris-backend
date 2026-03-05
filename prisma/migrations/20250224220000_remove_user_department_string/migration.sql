-- AlterTable: Remove colunas department e unit (string) do model User
ALTER TABLE "User" DROP COLUMN IF EXISTS "department";
ALTER TABLE "User" DROP COLUMN IF EXISTS "unit";
