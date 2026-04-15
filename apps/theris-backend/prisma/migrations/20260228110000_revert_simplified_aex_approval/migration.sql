-- Revert simplified approval: drop column (sempre 2 etapas de aprovação)
ALTER TABLE "Request" DROP COLUMN IF EXISTS "simplifiedAexApproval";
