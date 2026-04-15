-- AlterTable: Add level column to Access (extraordinary access level, ex: "NÍVEL 3 (CP-1)")
ALTER TABLE "Access" ADD COLUMN "level" TEXT;
