-- DropIndex
DROP INDEX "Budget_userId_type_categoryId_month_year_key";

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Saving" ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Budget_workspaceId_type_categoryId_month_year_key" ON "Budget"("workspaceId", "type", "categoryId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_inviteToken_key" ON "Workspace"("inviteToken");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Saving" ADD CONSTRAINT "Saving_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
