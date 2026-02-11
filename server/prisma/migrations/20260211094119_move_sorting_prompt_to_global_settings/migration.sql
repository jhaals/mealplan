/*
  Warnings:

  - You are about to drop the column `sortingPrompt` on the `ShoppingList` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN "sortingPrompt" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShoppingList" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShoppingList" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "ShoppingList";
DROP TABLE "ShoppingList";
ALTER TABLE "new_ShoppingList" RENAME TO "ShoppingList";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
