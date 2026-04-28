-- ToolOwnerChangeRoleConfirmation: idempotência do botão "Nível Ajustado" (CHANGE_ROLE)

CREATE TABLE "ToolOwnerChangeRoleConfirmation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dmTs" TEXT,
    "dmChannel" TEXT,

    CONSTRAINT "ToolOwnerChangeRoleConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolOwnerChangeRoleConfirmation_requestId_ownerId_toolId_key" ON "ToolOwnerChangeRoleConfirmation"("requestId", "ownerId", "toolId");

CREATE INDEX "ToolOwnerChangeRoleConfirmation_requestId_idx" ON "ToolOwnerChangeRoleConfirmation"("requestId");

ALTER TABLE "ToolOwnerChangeRoleConfirmation" ADD CONSTRAINT "ToolOwnerChangeRoleConfirmation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolOwnerChangeRoleConfirmation" ADD CONSTRAINT "ToolOwnerChangeRoleConfirmation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
