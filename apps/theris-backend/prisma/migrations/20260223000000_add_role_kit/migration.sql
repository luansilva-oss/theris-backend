-- AlterTable
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RoleKitItem" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "toolCode" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "accessLevelDesc" TEXT,
    "criticality" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoleKitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Role_code_key" ON "Role"("code");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RoleKitItem_roleId_fkey'
  ) THEN
    ALTER TABLE "RoleKitItem" ADD CONSTRAINT "RoleKitItem_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
