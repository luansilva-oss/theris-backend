/*
  Warnings:

  - You are about to drop the `AccessLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `timestamp` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tool" ADD COLUMN "accessLevels" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AccessLevel";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "targetUser" TEXT NOT NULL,
    "executor" TEXT NOT NULL,
    "details" TEXT NOT NULL
);
INSERT INTO "new_AuditLog" ("action", "details", "executor", "id", "targetUser") SELECT "action", "details", "executor", "id", "targetUser" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "requesterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentApproverRole" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "lastApproverId" TEXT,
    CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_lastApproverId_fkey" FOREIGN KEY ("lastApproverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("createdAt", "currentApproverRole", "details", "id", "justification", "lastApproverId", "requesterId", "status", "type", "updatedAt") SELECT "createdAt", "currentApproverRole", "details", "id", "justification", "lastApproverId", "requesterId", "status", "type", "updatedAt" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT,
    "departmentId" TEXT,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("departmentId", "email", "id", "name", "roleId") SELECT "departmentId", "email", "id", "name", "roleId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
