use crate::{ApiError, Result};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use rusqlite::{types::ValueRef, Connection, OptionalExtension, Params, Row};
use sha2::{Digest, Sha256};

// Prisma databases can mix numeric milliseconds with ISO timestamps.
pub const CREATED_AT_ORDER: &str = "CASE WHEN typeof(createdAt)='integer' THEN createdAt ELSE unixepoch(createdAt,'subsec')*1000 END";

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

pub fn timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<String> {
    let value = row.get_ref(index)?;
    let date = match value {
        ValueRef::Integer(ms) => DateTime::from_timestamp_millis(ms),
        ValueRef::Text(bytes) => std::str::from_utf8(bytes).ok().and_then(|text| {
            DateTime::parse_from_rfc3339(text)
                .ok()
                .map(|date| date.with_timezone(&Utc))
                .or_else(|| {
                    NaiveDateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S%.f")
                        .ok()
                        .map(|date| date.and_utc())
                })
        }),
        _ => None,
    };
    date.map(|date| date.to_rfc3339_opts(SecondsFormat::Millis, true))
        .ok_or_else(|| {
            rusqlite::Error::InvalidColumnType(
                index,
                row.as_ref()
                    .column_name(index)
                    .unwrap_or("timestamp")
                    .into(),
                value.data_type(),
            )
        })
}

pub fn optional_timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<Option<String>> {
    if matches!(row.get_ref(index)?, ValueRef::Null) {
        Ok(None)
    } else {
        timestamp(row, index).map(Some)
    }
}

pub fn query<T>(
    db: &Connection,
    sql: &str,
    params: impl Params,
    map: impl FnMut(&Row<'_>) -> rusqlite::Result<T>,
) -> Result<Vec<T>> {
    Ok(db
        .prepare(sql)?
        .query_map(params, map)?
        .collect::<rusqlite::Result<_>>()?)
}

pub fn one<T>(
    db: &Connection,
    sql: &str,
    params: impl Params,
    map: impl FnOnce(&Row<'_>) -> rusqlite::Result<T>,
    missing: &str,
) -> Result<T> {
    db.query_row(sql, params, map)
        .optional()?
        .ok_or_else(|| ApiError::new(404, missing))
}

pub fn changed(count: usize, missing: &str) -> Result<()> {
    if count == 0 {
        Err(ApiError::new(404, missing))
    } else {
        Ok(())
    }
}

pub fn initialize(db: &mut Connection) -> Result<()> {
    db.busy_timeout(std::time::Duration::from_secs(5))?;
    db.execute_batch(
        "PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, finished_at DATETIME,
        migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0);",
    )?;
    for (name, sql) in MIGRATIONS {
        let checksum = sha256(sql.as_bytes());
        let applied: Option<String> = db.query_row("SELECT checksum FROM _prisma_migrations WHERE migration_name=?1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL", [name], |r| r.get(0)).optional()?;
        if let Some(existing) = applied {
            if existing != checksum {
                return Err(ApiError::internal(format!(
                    "Migration checksum mismatch: {name}"
                )));
            }
            continue;
        }
        let failed: bool = db.query_row("SELECT EXISTS(SELECT 1 FROM _prisma_migrations WHERE migration_name=?1 AND finished_at IS NULL AND rolled_back_at IS NULL)", [name], |r| r.get(0))?;
        if failed {
            return Err(ApiError::internal(format!("Unresolved migration: {name}")));
        }
        // The historical table rebuild needs foreign keys disabled before BEGIN.
        db.execute_batch("PRAGMA foreign_keys=OFF;")?;
        let tx = db.transaction()?;
        // Preserve the setting that the historical Prisma migration otherwise drops.
        let old_prompt: Option<String> =
            if *name == "20260211094119_move_sorting_prompt_to_global_settings" {
                tx.query_row(
                    "SELECT sortingPrompt FROM ShoppingList WHERE id='singleton'",
                    [],
                    |row| row.get(0),
                )
                .optional()?
                .flatten()
            } else {
                None
            };
        tx.execute_batch(sql)?;
        if let Some(prompt) = old_prompt {
            tx.execute(
                "INSERT OR IGNORE INTO MealPlan (id,updatedAt) VALUES ('singleton',?1)",
                [now()],
            )?;
            tx.execute(
                "UPDATE MealPlan SET sortingPrompt=?1 WHERE id='singleton'",
                [prompt],
            )?;
        }
        let violations: i64 =
            tx.query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |r| {
                r.get(0)
            })?;
        if violations != 0 {
            return Err(ApiError::internal("Migration would break foreign keys"));
        }
        tx.execute("INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (?1,?2,?3,?4,?4,1)", rusqlite::params![id(), checksum, name, now()])?;
        tx.commit()?;
        db.execute_batch("PRAGMA foreign_keys=ON;")?;
    }
    let tx = db.transaction()?;
    for table in ["MealPlan", "ShoppingList", "TodoList"] {
        tx.execute(&format!("INSERT OR IGNORE INTO {table} (id, createdAt, updatedAt) VALUES ('singleton',?1,?1)"), [now()])?;
    }
    tx.commit()?;
    Ok(())
}

pub const MIGRATIONS: &[(&str, &str)] = &[
    ("20260205201428_init", include_str!("../prisma/migrations/20260205201428_init/migration.sql")),
    ("20260207135550_add_archived_meal_plan", include_str!("../prisma/migrations/20260207135550_add_archived_meal_plan/migration.sql")),
    ("20260207163905_add_shopping_list", include_str!("../prisma/migrations/20260207163905_add_shopping_list/migration.sql")),
    ("20260207183730_add_trmnl_sync_tracking", include_str!("../prisma/migrations/20260207183730_add_trmnl_sync_tracking/migration.sql")),
    ("20260211092821_add_sorting_prompt", include_str!("../prisma/migrations/20260211092821_add_sorting_prompt/migration.sql")),
    ("20260211094119_move_sorting_prompt_to_global_settings", include_str!("../prisma/migrations/20260211094119_move_sorting_prompt_to_global_settings/migration.sql")),
    ("20260312114311_add_todo_list", include_str!("../prisma/migrations/20260312114311_add_todo_list/migration.sql")),
    ("20260807095920_add_todo_description", include_str!("../prisma/migrations/20260807095920_add_todo_description/migration.sql")),
];
