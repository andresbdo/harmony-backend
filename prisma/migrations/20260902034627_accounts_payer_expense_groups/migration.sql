-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "balanceVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "expenseGroupId" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "expenseGroupId" TEXT;

-- CreateTable
CREATE TABLE "ExpenseGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpenseGroup" ADD CONSTRAINT "ExpenseGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_expenseGroupId_fkey" FOREIGN KEY ("expenseGroupId") REFERENCES "ExpenseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_expenseGroupId_fkey" FOREIGN KEY ("expenseGroupId") REFERENCES "ExpenseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
