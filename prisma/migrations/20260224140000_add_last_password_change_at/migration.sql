-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPasswordChangeAt" TIMESTAMP(3);

-- Set default for existing rows (so they get "now" and will be reminded in 90 days)
UPDATE "User" SET "lastPasswordChangeAt" = NOW() WHERE "lastPasswordChangeAt" IS NULL;
