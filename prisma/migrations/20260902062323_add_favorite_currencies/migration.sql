-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "favoriteCurrencies" TEXT[] DEFAULT ARRAY[]::TEXT[];
