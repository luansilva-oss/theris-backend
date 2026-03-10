-- AlterTable KBUFerramenta: split owner into ownerNome and ownerEmail
ALTER TABLE "KBUFerramenta" ADD COLUMN IF NOT EXISTS "ownerNome" TEXT;
ALTER TABLE "KBUFerramenta" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;

-- Migrate existing owner value to ownerNome (optional: could be email; we store as nome for backward compat)
UPDATE "KBUFerramenta" SET "ownerNome" = "owner" WHERE "owner" IS NOT NULL AND "ownerNome" IS NULL;

-- Drop old column
ALTER TABLE "KBUFerramenta" DROP COLUMN IF EXISTS "owner";
