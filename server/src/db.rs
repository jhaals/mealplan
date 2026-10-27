use crate::{ApiError, Result};
use chrono::{SecondsFormat, Utc};
use sha2::{Digest, Sha256};
use sqlx::{sqlite::SqlitePoolOptions, SqliteConnection, SqlitePool};
use std::{str::FromStr, time::Duration};

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

pub fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}
pub fn id() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub fn sha256(data: &[u8]) -> String {
    Sha256::digest(data)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}
pub fn changed(count: u64, missing: &str) -> Result<()> {
    if count == 0 {
        Err(ApiError::new(404, missing))
    } else {
        Ok(())
    }
}

pub async fn connect(url: &str) -> Result<SqlitePool> {
    let url = url
        .strip_prefix("file:")
        .map(|path| format!("sqlite:{path}"))
        .unwrap_or_else(|| url.into());
    let options = sqlx::sqlite::SqliteConnectOptions::from_str(&url)?
        .create_if_missing(true)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    let tables: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_one(&pool)
    .await?;
    if tables > 0 && !managed(&pool).await? {
        pool.close().await;
        return Err(ApiError::internal(
            "Existing database is not SQLx-managed; refusing to initialize an unsupported schema.",
        ));
    }
    MIGRATOR.run(&pool).await?;
    let mut tx = pool.begin().await?;
    seed(&mut tx).await?;
    tx.commit().await?;
    Ok(pool)
}
async fn managed(pool: &SqlitePool) -> Result<bool> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='_sqlx_migrations' AND type='table')",
    )
    .fetch_one(pool)
    .await?)
}
async fn seed(db: &mut SqliteConnection) -> Result<()> {
    let now = now();
    sqlx::query(
        "INSERT OR IGNORE INTO meal_plan (id,created_at,updated_at) VALUES ('singleton',?1,?1)",
    )
    .bind(&now)
    .execute(&mut *db)
    .await?;
    sqlx::query(
        "INSERT OR IGNORE INTO shopping_list (id,created_at,updated_at) VALUES ('singleton',?1,?1)",
    )
    .bind(&now)
    .execute(&mut *db)
    .await?;
    sqlx::query(
        "INSERT OR IGNORE INTO todo_list (id,created_at,updated_at) VALUES ('singleton',?1,?1)",
    )
    .bind(&now)
    .execute(&mut *db)
    .await?;
    sqlx::query("INSERT OR IGNORE INTO app_settings (id) VALUES ('singleton')")
        .execute(db)
        .await?;
    Ok(())
}
