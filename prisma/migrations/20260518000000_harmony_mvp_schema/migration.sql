-- AlterTable User
ALTER TABLE "User" ADD COLUMN "notificationsId" TEXT;

-- AlterTable Workspace - add subscriptions relation
-- (relation will be implicit in Prisma)

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE
);

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateTable UserSettings
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cotizacion1" TEXT NOT NULL DEFAULT 'oficial',
    "cotizacion2" TEXT,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- AlterTable Saving - handle migration of existing rows
ALTER TABLE "Saving" ADD COLUMN "name" TEXT;
ALTER TABLE "Saving" ADD COLUMN "targetAmount" DECIMAL(65,30);
ALTER TABLE "Saving" ADD COLUMN "targetDate" TIMESTAMP(3);

-- Migrate existing saving data: use amount as targetAmount, use description as name
UPDATE "Saving" SET "name" = COALESCE("description", 'Unnamed Goal'), "targetAmount" = "amount" WHERE "name" IS NULL;

-- Make the new columns NOT NULL
ALTER TABLE "Saving" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Saving" ALTER COLUMN "targetAmount" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Saving" DROP COLUMN "amount";
ALTER TABLE "Saving" DROP COLUMN "description";

-- AddColumn to Saving for transactions relation
-- (relation will be implicit in Prisma)

-- AlterTable Transaction
ALTER TABLE "Transaction" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "savingGoalId" TEXT;
ALTER TABLE "Transaction" ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AddForeignKey Transaction
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_savingGoalId_fkey" FOREIGN KEY ("savingGoalId") REFERENCES "Saving" ("id") ON DELETE SET NULL;

-- CreateIndex for UserSettings
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex for Notification
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex for Subscription
CREATE INDEX "Subscription_workspaceId_idx" ON "Subscription"("workspaceId");
