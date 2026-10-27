CREATE TABLE "archived_meal_plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE "archived_shopping_list" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE "day_plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meal_plan_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "day_plan_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "day_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "meal_day_plan_id_fkey" FOREIGN KEY ("day_plan_id") REFERENCES "day_plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "meal_plan" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "start_date" TEXT,
    "current_day" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL
);

CREATE TABLE "shopping_list" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL
);

CREATE TABLE "shopping_list_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopping_list_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checked" INTEGER NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "shopping_list_item_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_list" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "todo_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todo_list_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checked" INTEGER NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_recurring" INTEGER NOT NULL DEFAULT false,
    "recurrence_interval" TEXT,
    "recurrence_days" INTEGER,
    "next_due_date" TEXT,
    "last_completed_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL, "description" TEXT,
    CONSTRAINT "todo_item_todo_list_id_fkey" FOREIGN KEY ("todo_list_id") REFERENCES "todo_list" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "todo_list" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX "day_plan_meal_plan_id_date_key" ON "day_plan"("meal_plan_id", "date");

CREATE INDEX "day_plan_meal_plan_id_idx" ON "day_plan"("meal_plan_id");

CREATE INDEX "meal_day_plan_id_idx" ON "meal"("day_plan_id");

CREATE INDEX "shopping_list_item_shopping_list_id_idx" ON "shopping_list_item"("shopping_list_id");

CREATE INDEX "todo_item_todo_list_id_idx" ON "todo_item"("todo_list_id");

CREATE TABLE app_settings (
    id TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    sorting_prompt TEXT,
    last_push_hash TEXT,
    last_push_at TEXT,
    last_push_error TEXT
);
