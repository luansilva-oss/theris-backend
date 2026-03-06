-- AEX: campos para aprovação pelo SI (controle de fechamento duplo)
ALTER TABLE "Request" ADD COLUMN "siApprovedBy" TEXT;
ALTER TABLE "Request" ADD COLUMN "siApprovedAt" TIMESTAMP(3);
