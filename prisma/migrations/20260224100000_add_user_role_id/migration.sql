-- Add roleId to User if missing (schema expects it; some DBs may not have it from init)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleId" TEXT;
