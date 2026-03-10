-- DropIndex: remove unique on Role.code (KBS) so the same code can exist in different departments
DROP INDEX IF EXISTS "Role_code_key";

-- CreateIndex: composite unique (code, departmentId) — same KBS in different departments allowed; duplicate in same department prevented
CREATE UNIQUE INDEX "Role_code_departmentId_key" ON "Role"("code", "departmentId");
