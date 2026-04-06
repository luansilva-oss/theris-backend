-- AlterTable
ALTER TABLE "User" ADD COLUMN "jumpcloudId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_jumpcloudId_key" ON "User"("jumpcloudId");
