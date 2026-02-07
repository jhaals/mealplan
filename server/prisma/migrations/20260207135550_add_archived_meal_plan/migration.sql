-- CreateTable
CREATE TABLE "ArchivedMealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
