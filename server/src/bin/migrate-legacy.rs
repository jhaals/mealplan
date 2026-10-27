use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use mealplan_server::db;
use sqlx::{QueryBuilder, Row, Sqlite, SqliteConnection, SqlitePool};
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
};

type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

// Import only the current deployed schema; the web server never reads legacy tables.
const TABLES: &[(&str, &str)] = &[
    ("MealPlan", "meal_plan"),
    ("ShoppingList", "shopping_list"),
    ("TodoList", "todo_list"),
    ("DayPlan", "day_plan"),
    ("Meal", "meal"),
    ("ShoppingListItem", "shopping_list_item"),
    ("TodoItem", "todo_item"),
    ("ArchivedMealPlan", "archived_meal_plan"),
    ("ArchivedShoppingList", "archived_shopping_list"),
    ("MealPlan", "app_settings"),
];
#[derive(sqlx::FromRow)]
struct Column {
    name: String,
    #[sqlx(rename = "type")]
    kind: String,
}
#[derive(Debug, PartialEq)]
enum Cell {
    Text(Option<String>),
    Integer(Option<i64>),
}
fn camel_case(name: &str) -> String {
    let mut uppercase = false;
    name.chars()
        .filter_map(|ch| {
            if ch == '_' {
                uppercase = true;
                None
            } else if uppercase {
                uppercase = false;
                Some(ch.to_ascii_uppercase())
            } else {
                Some(ch)
            }
        })
        .collect()
}
fn timestamp(value: &str) -> Result<String> {
    let date = if let Ok(ms) = value.parse::<i64>() {
        DateTime::from_timestamp_millis(ms)
    } else {
        DateTime::parse_from_rfc3339(value)
            .ok()
            .map(|date| date.with_timezone(&Utc))
            .or_else(|| {
                NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f")
                    .ok()
                    .map(|date| date.and_utc())
            })
    };
    Ok(date
        .ok_or_else(|| format!("Invalid legacy timestamp: {value}"))?
        .to_rfc3339_opts(SecondsFormat::Millis, true))
}
async fn rows(
    db: &mut SqliteConnection,
    table: &str,
    columns: &[Column],
    legacy: bool,
) -> Result<Vec<Vec<Cell>>> {
    let mut query = QueryBuilder::<Sqlite>::new("SELECT ");
    let mut separated = query.separated(",");
    for column in columns {
        let name = if legacy {
            camel_case(&column.name)
        } else {
            column.name.clone()
        };
        // Identifiers come exclusively from our embedded schema and TABLES above.
        separated.push(format!("CAST(\"{name}\" AS {})", column.kind));
        separated.push(format!("typeof(\"{name}\")"));
    }
    query.push(" FROM \"").push(table).push("\" ORDER BY rowid");
    let rows = query.build().fetch_all(db).await?;
    let mut result = Vec::new();
    for row in rows {
        let mut values = Vec::new();
        for (index, column) in columns.iter().enumerate() {
            let kind: String = row.try_get(index * 2 + 1)?;
            let timestamp_column = column.name.ends_with("_at");
            let valid = kind == "null"
                || (column.kind == "TEXT" && kind == "text")
                || (column.kind == "INTEGER" && kind == "integer")
                || (legacy && timestamp_column && kind == "integer");
            if !valid {
                return Err(
                    format!("Invalid storage type for {table}.{}: {kind}", column.name).into(),
                );
            }
            let cell = match column.kind.as_str() {
                "TEXT" => {
                    let value: Option<String> = row.try_get(index * 2)?;
                    let value = if legacy && timestamp_column {
                        value
                            .map(|value| timestamp(&value))
                            .transpose()
                            .map_err(|error| format!("{table}.{}: {error}", column.name))?
                    } else {
                        value
                    };
                    Cell::Text(value)
                }
                "INTEGER" => Cell::Integer(row.try_get(index * 2)?),
                kind => return Err(format!("Unsupported import column type: {kind}").into()),
            };
            values.push(cell);
        }
        result.push(values);
    }
    Ok(result)
}
async fn copy(source: &SqlitePool, destination: &SqlitePool) -> Result<()> {
    db::check(source).await?;
    let mut source_tx = source.begin().await?;
    let mut tx = destination.begin().await?;
    for &(old, new) in TABLES {
        let columns: Vec<Column> =
            sqlx::query_as("SELECT name,type FROM pragma_table_info(?) ORDER BY cid")
                .bind(new)
                .fetch_all(&mut *tx)
                .await?;
        if columns.is_empty() {
            return Err(format!("Missing destination table: {new}").into());
        }
        let original = rows(&mut source_tx, old, &columns, true).await?;
        for row in &original {
            let mut query = QueryBuilder::<Sqlite>::new("INSERT INTO \"");
            query.push(new).push("\" (");
            let mut separated = query.separated(",");
            for column in &columns {
                separated.push(format!("\"{}\"", column.name));
            }
            query.push(") VALUES (");
            let mut separated = query.separated(",");
            for value in row {
                match value {
                    Cell::Text(value) => {
                        separated.push_bind(value);
                    }
                    Cell::Integer(value) => {
                        separated.push_bind(value);
                    }
                }
            }
            query.push(")");
            query.build().execute(&mut *tx).await?;
        }
        let imported = rows(&mut tx, new, &columns, false).await?;
        if original != imported {
            return Err(format!("Data verification failed for {old}").into());
        }
        println!(
            "Imported and verified {} rows: {old} -> {new}",
            original.len()
        );
    }
    db::seed(&mut tx).await?;
    tx.commit().await?;
    source_tx.commit().await?;
    db::check(destination).await?;
    Ok(())
}
fn url(path: &Path) -> Result<String> {
    Ok(format!(
        "file:{}",
        path.to_str().ok_or("Database path must be UTF-8")?
    ))
}
fn same_file(a: &Path, b: &Path) -> bool {
    a == b || (a.exists() && b.exists() && fs::canonicalize(a).ok() == fs::canonicalize(b).ok())
}
async fn migrate(source: &Path, destination: &Path) -> Result<()> {
    if same_file(source, destination) {
        return Err("Source and destination must be different files".into());
    }
    if destination.exists() {
        let pool = db::open(&url(destination)?, false, false).await?;
        let result: Result<()> = async {
            if !db::managed(&pool).await? {
                return Err(
                    "Existing destination is not SQLx-managed; refusing to overwrite it".into(),
                );
            }
            db::MIGRATOR.run(&pool).await?;
            db::check(&pool).await?;
            Ok(())
        }
        .await;
        pool.close().await;
        result?;
        println!("SQLx database already initialized; legacy import skipped");
        return Ok(());
    }
    let mut temporary = destination.as_os_str().to_os_string();
    temporary.push(".importing");
    let temporary = PathBuf::from(temporary);
    if same_file(source, &temporary) {
        return Err("Source overlaps the import's temporary file".into());
    }
    if temporary.exists() {
        fs::remove_file(&temporary)?;
    }
    let pool = db::open(&url(&temporary)?, true, false).await?;
    let result: Result<()> = async {
        db::MIGRATOR.run(&pool).await?;
        if source.exists() {
            let old = db::open(&url(source)?, false, true).await?;
            let result = copy(&old, &pool).await;
            old.close().await;
            result?;
        } else {
            let mut tx = pool.begin().await?;
            db::seed(&mut tx).await?;
            tx.commit().await?;
            db::check(&pool).await?;
        }
        Ok(())
    }
    .await;
    pool.close().await;
    if let Err(error) = result {
        fs::remove_file(&temporary)?;
        return Err(error);
    }
    fs::File::open(&temporary)?.sync_all()?;
    // Atomic publication without ever overwriting an existing destination.
    fs::hard_link(&temporary, destination)?;
    fs::remove_file(&temporary)?;
    fs::File::open(
        destination
            .parent()
            .filter(|path| !path.as_os_str().is_empty())
            .unwrap_or(Path::new(".")),
    )?
    .sync_all()?;
    println!(
        "Database ready: {}. Original retained: {}",
        destination.display(),
        source.display()
    );
    Ok(())
}
#[tokio::main]
async fn main() -> Result<()> {
    let args: Vec<_> = std::env::args_os().collect();
    if args.len() != 3 {
        return Err("Usage: migrate-legacy <old-database> <new-database>".into());
    }
    migrate(Path::new(&args[1]), Path::new(&args[2])).await
}
