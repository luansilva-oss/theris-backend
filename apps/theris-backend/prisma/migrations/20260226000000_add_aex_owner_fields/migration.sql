-- Add AEX (Acesso Extraordinário) owner approval fields to Request
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "ownerApprovedAt" TIMESTAMP(3);
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "ownerApprovedBy" TEXT;
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "ownerRejectedAt" TIMESTAMP(3);
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "ownerRejectedBy" TEXT;
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "toolName" TEXT;
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "accessLevel" TEXT;
