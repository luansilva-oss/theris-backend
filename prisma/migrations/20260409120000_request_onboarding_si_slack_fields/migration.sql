-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "onboardingFullName" TEXT,
ADD COLUMN     "onboardingManagerEmail" TEXT,
ADD COLUMN     "siSlackMessageTs" JSONB,
ADD COLUMN     "jumpcloudCreatedAt" TIMESTAMP(3),
ADD COLUMN     "googleCreatedAt" TIMESTAMP(3),
ADD COLUMN     "slackActionDateNotifiedAt" TIMESTAMP(3);
