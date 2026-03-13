CREATE TABLE "JumpCloudEventLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "resourceName" TEXT,
  "clientIp" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JumpCloudEventLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemConfig" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "SenhaExpiracaoNotificacao" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SenhaExpiracaoNotificacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SenhaExpiracaoNotificacao_userId_sentAt_idx" ON "SenhaExpiracaoNotificacao"("userId", "sentAt");

ALTER TABLE "SenhaExpiracaoNotificacao" ADD CONSTRAINT "SenhaExpiracaoNotificacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
