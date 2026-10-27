use axum::{
    body::{to_bytes, Body},
    http::Request,
};
use mealplan_server::{db, router, App};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};
use tower::ServiceExt;

struct Files(PathBuf);
impl Files {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("mealplan-import-{}", db::id()));
        fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn old(&self) -> PathBuf {
        self.0.join("old.db")
    }
    fn new_db(&self) -> PathBuf {
        self.0.join("new.db")
    }
}
impl Drop for Files {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn url(path: &Path) -> String {
    format!("file:{}", path.display())
}
fn import(files: &Files) -> Output {
    Command::new(env!("CARGO_BIN_EXE_migrate-legacy"))
        .args([files.old(), files.new_db()])
        .output()
        .unwrap()
}
fn successful(output: Output) {
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}
const SNAPSHOT:&str="[ {\"date\":\"2026-10-26\",\"meals\":[{\"id\":\"archived-meal\",\"name\":\"Pasta\",\"createdAt\":\"2023-11-14T22:13:20.000Z\"}]} ]";
async fn fixture(files: &Files) {
    let pool = db::open(&url(&files.old()), true, false).await.unwrap();
    sqlx::raw_sql(include_str!("fixtures/legacy.sql"))
        .execute(&pool)
        .await
        .unwrap();
    sqlx::raw_sql("INSERT INTO MealPlan (id,startDate,currentDay,createdAt,updatedAt,sortingPrompt,lastPushHash,lastPushAt,lastPushError) VALUES ('singleton','2026-10-26','2026-10-27',1700000000000,'2023-11-14 22:13:20','Keep aisle order','old-hash',1700000000000,'Keep error');
        INSERT INTO DayPlan (id,mealPlanId,date,createdAt,updatedAt) VALUES ('old-day','singleton','2026-10-26','2026-10-26T11:00:00.123+01:00','2026-10-26 12:00:00');
        INSERT INTO Meal (id,dayPlanId,name,createdAt,updatedAt) VALUES ('old-meal','old-day','Köttbullar',1700000000000,1700000000000);
        INSERT INTO ShoppingList (id,createdAt,updatedAt) VALUES ('singleton',1700000000000,1700000000000);
        INSERT INTO ShoppingListItem (id,shoppingListId,name,checked,sortOrder,createdAt,updatedAt) VALUES ('old-item','singleton','Mjölk',1,3,'2023-11-14T22:13:20.000Z',1700000000000);
        INSERT INTO TodoList (id,createdAt,updatedAt) VALUES ('singleton',1700000000000,1700000000000);
        INSERT INTO TodoItem (id,todoListId,name,description,checked,sortOrder,isRecurring,recurrenceInterval,recurrenceDays,nextDueDate,lastCompletedAt,createdAt,updatedAt) VALUES ('old-todo','singleton','Clean','Keep this note',0,4,1,'weekly',7,'2000-01-01',1700000000000,1700000000000,1700000000000);
        INSERT INTO TodoItem (id,todoListId,name,createdAt,updatedAt) VALUES ('nullable-todo','singleton','Simple task',1700000000000,1700000000000);
        INSERT INTO ArchivedShoppingList (id,data,createdAt) VALUES ('old-shopping-history','[]',1700000000000);").execute(&pool).await.unwrap();
    sqlx::query("INSERT INTO ArchivedMealPlan (id,startDate,endDate,data,createdAt) VALUES ('old-history','2026-10-26','2026-10-26',?,1700000000000)").bind(SNAPSHOT).execute(&pool).await.unwrap();
    pool.close().await;
}
async fn api(app: &App, path: &str) -> Value {
    let response = router(app.clone(), "/nonexistent")
        .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), 200, "{path}");
    serde_json::from_slice(&to_bytes(response.into_body(), 1024 * 1024).await.unwrap()).unwrap()
}
#[tokio::test]
async fn upgrade_preserves_all_data_and_restarts_without_reimporting() {
    let files = Files::new();
    fixture(&files).await;
    let original = fs::read(files.old()).unwrap();
    successful(import(&files));
    assert_eq!(original, fs::read(files.old()).unwrap());
    let app = App::connect(&url(&files.new_db())).await.unwrap();
    assert_eq!(
        api(&app, "/api/meal-plan").await["days"][0]["meals"][0],
        json!({"id":"old-meal","name":"Köttbullar","createdAt":"2023-11-14T22:13:20.000Z"})
    );
    let shopping = api(&app, "/api/shopping-list").await;
    assert_eq!(shopping["items"][0]["id"], "old-item");
    assert_eq!(shopping["items"][0]["checked"], true);
    assert_eq!(shopping["items"][0]["sortOrder"], 3);
    let todos = api(&app, "/api/todo-list").await;
    let recurring = todos["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == "old-todo")
        .unwrap();
    assert_eq!(recurring["description"], "Keep this note");
    assert_eq!(recurring["recurrenceInterval"], "weekly");
    assert_eq!(recurring["recurrenceDays"], 7);
    assert_eq!(recurring["lastCompletedAt"], "2023-11-14T22:13:20.000Z");
    let simple = todos["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == "nullable-todo")
        .unwrap();
    assert!(simple["description"].is_null());
    assert!(simple["lastCompletedAt"].is_null());
    assert_eq!(
        api(&app, "/api/shopping-list/config").await["sortingPrompt"],
        "Keep aisle order"
    );
    assert_eq!(
        api(&app, "/api/trmnl/status").await["lastPushError"],
        "Keep error"
    );
    assert_eq!(
        api(&app, "/api/trmnl/status").await["lastPushAt"],
        "2023-11-14T22:13:20.000Z"
    );
    assert_eq!(
        api(&app, "/api/meal-plan/history").await[0]["id"],
        "old-history"
    );
    assert_eq!(
        api(&app, "/api/shopping-list/history").await[0]["id"],
        "old-shopping-history"
    );
    let snapshot: String =
        sqlx::query_scalar("SELECT data FROM archived_meal_plan WHERE id='old-history'")
            .fetch_one(&app.db)
            .await
            .unwrap();
    assert_eq!(snapshot, SNAPSHOT);
    let timestamp: String =
        sqlx::query_scalar("SELECT created_at FROM day_plan WHERE id='old-day'")
            .fetch_one(&app.db)
            .await
            .unwrap();
    assert_eq!(timestamp, "2026-10-26T10:00:00.123Z");
    sqlx::query("UPDATE todo_item SET description='New data after cutover' WHERE id='old-todo'")
        .execute(&app.db)
        .await
        .unwrap();
    app.db.close().await;
    successful(import(&files));
    let app = App::connect(&url(&files.new_db())).await.unwrap();
    let note: String = sqlx::query_scalar("SELECT description FROM todo_item WHERE id='old-todo'")
        .fetch_one(&app.db)
        .await
        .unwrap();
    assert_eq!(note, "New data after cutover");
    let prisma: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='_prisma_migrations')",
    )
    .fetch_one(&app.db)
    .await
    .unwrap();
    assert!(!prisma);
    db::check(&app.db).await.unwrap();
    app.db.close().await;
    assert_eq!(original, fs::read(files.old()).unwrap());
}
#[tokio::test]
async fn failed_import_leaves_original_unchanged_and_retries_cleanly() {
    let files = Files::new();
    fixture(&files).await;
    let old = db::open(&url(&files.old()), false, false).await.unwrap();
    sqlx::query("UPDATE Meal SET createdAt='invalid' WHERE id='old-meal'")
        .execute(&old)
        .await
        .unwrap();
    old.close().await;
    let original = fs::read(files.old()).unwrap();
    assert!(!import(&files).status.success());
    assert!(!files.new_db().exists());
    assert_eq!(original, fs::read(files.old()).unwrap());
    let old = db::open(&url(&files.old()), false, false).await.unwrap();
    sqlx::query("UPDATE Meal SET createdAt=1700000000000 WHERE id='old-meal'")
        .execute(&old)
        .await
        .unwrap();
    old.close().await;
    fs::write(
        files.0.join("new.db.importing"),
        b"interrupted partial import",
    )
    .unwrap();
    successful(import(&files));
    assert!(!files.0.join("new.db.importing").exists());
}
#[tokio::test]
async fn invalid_destination_is_never_overwritten() {
    let files = Files::new();
    fixture(&files).await;
    fs::write(files.new_db(), b"bad existing database").unwrap();
    assert!(!import(&files).status.success());
    assert_eq!(fs::read(files.new_db()).unwrap(), b"bad existing database");
}
#[tokio::test]
async fn fresh_install_and_missing_lazy_singletons_are_initialized() {
    let files = Files::new();
    successful(import(&files));
    let app = App::connect(&url(&files.new_db())).await.unwrap();
    assert_eq!(api(&app, "/api/shopping-list").await["items"], json!([]));
    app.db.close().await;
    let files = Files::new();
    fixture(&files).await;
    let pool = db::open(&url(&files.old()), false, false).await.unwrap();
    sqlx::raw_sql("DELETE FROM ShoppingListItem; DELETE FROM ShoppingList; DELETE FROM TodoItem; DELETE FROM TodoList;").execute(&pool).await.unwrap();
    pool.close().await;
    successful(import(&files));
    let app = App::connect(&url(&files.new_db())).await.unwrap();
    assert_eq!(api(&app, "/api/todo-list").await["items"], json!([]));
    app.db.close().await;
}
#[tokio::test]
async fn legacy_file_cannot_be_used_as_a_fresh_sqlx_database() {
    let files = Files::new();
    fixture(&files).await;
    let before = fs::read(files.old()).unwrap();
    assert!(App::connect(&url(&files.old())).await.is_err());
    assert_eq!(before, fs::read(files.old()).unwrap());
}

#[tokio::test]
async fn import_keeps_display_order_when_sort_keys_tie() {
    let files = Files::new();
    fixture(&files).await;
    let pool = db::open(&url(&files.old()), false, false).await.unwrap();
    sqlx::raw_sql("DELETE FROM ShoppingListItem;
        INSERT INTO ShoppingListItem (id,shoppingListId,name,createdAt,updatedAt) VALUES ('z-first','singleton','First',1700000000000,1700000000000);
        INSERT INTO ShoppingListItem (id,shoppingListId,name,createdAt,updatedAt) VALUES ('a-second','singleton','Second',1700000000000,1700000000000);").execute(&pool).await.unwrap();
    pool.close().await;
    successful(import(&files));
    let app = App::connect(&url(&files.new_db())).await.unwrap();
    let list = api(&app, "/api/shopping-list").await;
    assert_eq!(list["items"][0]["id"], "z-first");
    assert_eq!(list["items"][1]["id"], "a-second");
    app.db.close().await;
}

#[tokio::test]
async fn malformed_numeric_values_are_not_silently_coerced() {
    let files = Files::new();
    fixture(&files).await;
    let pool = db::open(&url(&files.old()), false, false).await.unwrap();
    sqlx::query("UPDATE ShoppingListItem SET sortOrder='not a number'")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    let original = fs::read(files.old()).unwrap();
    assert!(!import(&files).status.success());
    assert!(!files.new_db().exists());
    assert_eq!(original, fs::read(files.old()).unwrap());
}
