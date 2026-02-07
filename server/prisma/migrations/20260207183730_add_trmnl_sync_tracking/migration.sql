-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN "lastPushAt" DATETIME;
ALTER TABLE "MealPlan" ADD COLUMN "lastPushError" TEXT;
ALTER TABLE "MealPlan" ADD COLUMN "lastPushHash" TEXT;
