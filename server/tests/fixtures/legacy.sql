CREATE TABLE "ArchivedMealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ArchivedShoppingList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DayPlan_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meal_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "startDate" TEXT,
    "currentDay" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
, "lastPushAt" DATETIME, "lastPushError" TEXT, "lastPushHash" TEXT, "sortingPrompt" TEXT);

CREATE TABLE "ShoppingList" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shoppingListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShoppingListItem_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "ShoppingList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todoListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceInterval" TEXT,
    "recurrenceDays" INTEGER,
    "nextDueDate" TEXT,
    "lastCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "description" TEXT,
    CONSTRAINT "TodoItem_todoListId_fkey" FOREIGN KEY ("todoListId") REFERENCES "TodoList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TodoList" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DayPlan_mealPlanId_date_key" ON "DayPlan"("mealPlanId", "date");

CREATE INDEX "DayPlan_mealPlanId_idx" ON "DayPlan"("mealPlanId");

CREATE INDEX "Meal_dayPlanId_idx" ON "Meal"("dayPlanId");

CREATE INDEX "ShoppingListItem_shoppingListId_idx" ON "ShoppingListItem"("shoppingListId");

CREATE INDEX "TodoItem_todoListId_idx" ON "TodoItem"("todoListId");
