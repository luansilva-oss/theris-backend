-- AlterTable: Tool - campos de revisão periódica (90 dias)
ALTER TABLE "Tool" ADD COLUMN IF NOT EXISTS "lastReviewAt" TIMESTAMP(3);
ALTER TABLE "Tool" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP(3);

-- CreateTable: controle de notificação enviada (evitar duplicata no mesmo dia por Owner)
CREATE TABLE IF NOT EXISTS "RevisaoNotificacaoEnviada" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisaoNotificacaoEnviada_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RevisaoNotificacaoEnviada" ADD CONSTRAINT "RevisaoNotificacaoEnviada_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "RevisaoNotificacaoEnviada_ownerId_sentAt_idx" ON "RevisaoNotificacaoEnviada"("ownerId", "sentAt");
