-- CreateEnum
CREATE TYPE "RevokeTrigger" AS ENUM ('CRON_EXPIRED', 'ADMIN_EARLY');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "revokedById" TEXT,
ADD COLUMN "revokeReason" TEXT,
ADD COLUMN "revokeTrigger" "RevokeTrigger";

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
