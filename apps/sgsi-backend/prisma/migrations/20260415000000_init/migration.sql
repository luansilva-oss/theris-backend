-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('MEETING', 'REVIEW', 'AUDIT', 'TRAINING', 'ACTIVITY', 'REPORT');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('SCHEDULED', 'DUE_SOON', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('IMMEDIATE', 'PLANNED');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('OPEN', 'MEETING_SCHEDULED', 'DECISION_RECORDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OccurrenceResult" AS ENUM ('COMPLETED', 'PARTIAL', 'SKIPPED');

-- CreateTable
CREATE TABLE "sgsi_recurring_actions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActionType" NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "isoControls" TEXT[],
    "isoDescription" TEXT,
    "conGc10Ref" TEXT,
    "relatedPolicies" TEXT[],
    "responsibleEmail" TEXT NOT NULL,
    "backupEmail" TEXT,
    "lastDoneAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ActionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clickupListId" TEXT,
    "lastClickupTaskId" TEXT,
    "lastAlertSentAt" TIMESTAMP(3),
    "lastDueSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sgsi_recurring_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sgsi_occurrences" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "executedByEmail" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "OccurrenceResult" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "clickupTaskId" TEXT,
    "slackMessageTs" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PANEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sgsi_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sgsi_changes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "isoControls" TEXT[],
    "reportedByEmail" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ChangeStatus" NOT NULL DEFAULT 'OPEN',
    "meetingAt" TIMESTAMP(3),
    "meetingNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decision" TEXT,
    "decisionMakers" TEXT[],
    "clickupTaskId" TEXT,
    "slackMessageTs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sgsi_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sgsi_change_impacts" (
    "id" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "impactDescription" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sgsi_change_impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sgsi_audit_logs" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'PANEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sgsi_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sgsi_cron_logs" (
    "id" TEXT NOT NULL,
    "cronName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "success" BOOLEAN NOT NULL DEFAULT false,
    "actionsProcessed" INTEGER NOT NULL DEFAULT 0,
    "alertsSent" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sgsi_cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sgsi_change_impacts_changeId_actionId_key" ON "sgsi_change_impacts"("changeId", "actionId");

-- AddForeignKey
ALTER TABLE "sgsi_occurrences" ADD CONSTRAINT "sgsi_occurrences_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "sgsi_recurring_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sgsi_change_impacts" ADD CONSTRAINT "sgsi_change_impacts_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "sgsi_changes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sgsi_change_impacts" ADD CONSTRAINT "sgsi_change_impacts_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "sgsi_recurring_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

