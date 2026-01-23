-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departmentId" TEXT,
    "roleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    CONSTRAINT "Tool_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    CONSTRAINT "AccessLevel_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SI',
    "currentApproverRole" TEXT NOT NULL DEFAULT 'SI',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastApproverId" TEXT,
    CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_lastApproverId_fkey" FOREIGN KEY ("lastApproverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "targetUser" TEXT NOT NULL,
    "executor" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
