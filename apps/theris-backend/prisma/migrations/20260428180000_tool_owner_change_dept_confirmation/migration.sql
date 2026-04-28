-- ToolOwnerChangeDeptConfirmation: idempotência do botão dept_review_done (CHANGE_ROLE mudança de departamento)

CREATE TABLE "ToolOwnerChangeDeptConfirmation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dmTs" TEXT,
    "dmChannel" TEXT,

    CONSTRAINT "ToolOwnerChangeDeptConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolOwnerChangeDeptConfirmation_requestId_ownerId_toolId_key" ON "ToolOwnerChangeDeptConfirmation"("requestId", "ownerId", "toolId");

CREATE INDEX "ToolOwnerChangeDeptConfirmation_requestId_idx" ON "ToolOwnerChangeDeptConfirmation"("requestId");

ALTER TABLE "ToolOwnerChangeDeptConfirmation" ADD CONSTRAINT "ToolOwnerChangeDeptConfirmation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolOwnerChangeDeptConfirmation" ADD CONSTRAINT "ToolOwnerChangeDeptConfirmation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
