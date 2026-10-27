use mealplan_server::{db, App};
use std::{fs, path::PathBuf};

struct Database(PathBuf);
impl Database {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!("mealplan-{}.db", db::id())))
    }
    fn url(&self) -> String {
        format!("file:{}", self.0.display())
    }
}
impl Drop for Database {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

#[tokio::test]
async fn startup_initializes_database_and_preserves_data_on_restart() {
    let file = Database::new();
    let app = App::connect(&file.url()).await.unwrap();
    for table in ["meal_plan", "shopping_list", "todo_list", "app_settings"] {
        let mut query = sqlx::QueryBuilder::<sqlx::Sqlite>::new("SELECT count(*) FROM ");
        query.push(table).push(" WHERE id='singleton'");
        let count: i64 = query.build_query_scalar().fetch_one(&app.db).await.unwrap();
        assert_eq!(count, 1, "{table}");
    }
    sqlx::query("UPDATE app_settings SET sorting_prompt='Keep my settings' WHERE id='singleton'")
        .execute(&app.db)
        .await
        .unwrap();
    sqlx::query("INSERT INTO shopping_list_item (id,shopping_list_id,name,created_at,updated_at) VALUES ('item','singleton','Milk',?1,?1)")
        .bind(db::now()).execute(&app.db).await.unwrap();
    app.db.close().await;

    let app = App::connect(&file.url()).await.unwrap();
    let prompt: String = sqlx::query_scalar("SELECT sorting_prompt FROM app_settings")
        .fetch_one(&app.db)
        .await
        .unwrap();
    assert_eq!(prompt, "Keep my settings");
    let name: String = sqlx::query_scalar("SELECT name FROM shopping_list_item WHERE id='item'")
        .fetch_one(&app.db)
        .await
        .unwrap();
    assert_eq!(name, "Milk");
    let migrations: i64 = sqlx::query_scalar("SELECT count(*) FROM _sqlx_migrations WHERE success")
        .fetch_one(&app.db)
        .await
        .unwrap();
    assert_eq!(migrations, 1);
    app.db.close().await;
}

#[tokio::test]
async fn startup_rejects_an_unmanaged_database_without_changing_it() {
    let file = Database::new();
    let pool = sqlx::SqlitePool::connect(&format!(
        "{}?mode=rwc",
        file.url().replace("file:", "sqlite:")
    ))
    .await
    .unwrap();
    sqlx::query("CREATE TABLE unrelated (id TEXT PRIMARY KEY)")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    let before = fs::read(&file.0).unwrap();
    assert!(App::connect(&file.url()).await.is_err());
    assert_eq!(before, fs::read(&file.0).unwrap());
}
