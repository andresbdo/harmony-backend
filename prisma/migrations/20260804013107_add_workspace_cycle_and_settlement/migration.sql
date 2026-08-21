-- CreateEnum
CREATE TYPE "WorkspaceCycle" AS ENUM ('INDEFINITE', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "cycle" "WorkspaceCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "weekStartDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "yearStartMonth" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkspaceSettlement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "balances" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettlement_workspaceId_periodStart_key" ON "WorkspaceSettlement"("workspaceId", "periodStart");

-- AddForeignKey
ALTER TABLE "WorkspaceSettlement" ADD CONSTRAINT "WorkspaceSettlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
