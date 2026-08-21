-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('MANUAL', 'SALARY_BASED');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "splitMode" "SplitMode" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "salary" DECIMAL(65,30);
