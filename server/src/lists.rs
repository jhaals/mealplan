use crate::{
    db::{self, changed},
    integrations,
    models::{success, ArchivedShoppingList, ListState, ShoppingItem, Success, TodoItem},
    nullable, present, required, today, ApiError, ApiJson, App, Result,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqliteConnection;

pub fn routes() -> Router<App> {
    Router::new()
        .route("/shopping-list", get(get_shopping))
        .route("/shopping-list/items", post(add_shopping))
        .route("/shopping-list/items/{id}/toggle", put(toggle_shopping))
        .route("/shopping-list/items/{id}", delete(delete_shopping))
        .route("/shopping-list/reorder", put(reorder_shopping))
        .route("/shopping-list/archive", post(archive))
        .route("/shopping-list/history", get(history))
        .route("/shopping-list/history/{id}", delete(delete_history))
        .route("/shopping-list/sort", post(sort))
        .route("/shopping-list/config", get(get_config).put(update_config))
        .route("/shopping-list/config/default-prompt", get(default_prompt))
        .route("/todo-list", get(get_todos))
        .route("/todo-list/recurring", get(recurring))
        .route("/todo-list/items", post(add_todo))
        .route("/todo-list/items/{id}/toggle", put(toggle_todo))
        .route(
            "/todo-list/items/{id}",
            put(update_todo).delete(delete_todo),
        )
        .route("/todo-list/reorder", put(reorder_todos))
        .route("/todo-list/clear-completed", post(clear_completed))
}
pub async fn shopping_list(db: &mut SqliteConnection) -> Result<ListState<ShoppingItem>> {
    let created_at =
        sqlx::query_scalar("SELECT created_at FROM shopping_list WHERE id='singleton'")
            .fetch_one(&mut *db)
            .await?;
    let items = sqlx::query_as(
        "SELECT * FROM shopping_list_item WHERE shopping_list_id='singleton' ORDER BY sort_order",
    )
    .fetch_all(db)
    .await?;
    Ok(ListState { created_at, items })
}
async fn shopping_item(db: &mut SqliteConnection, id: &str) -> Result<ShoppingItem> {
    Ok(
        sqlx::query_as("SELECT * FROM shopping_list_item WHERE id=?")
            .bind(id)
            .fetch_one(db)
            .await?,
    )
}
async fn todo_item(db: &mut SqliteConnection, id: &str) -> Result<TodoItem> {
    Ok(sqlx::query_as("SELECT * FROM todo_item WHERE id=?")
        .bind(id)
        .fetch_one(db)
        .await?)
}
async fn reorder(db: &mut SqliteConnection, sql: &'static str, ids: &[String]) -> Result<()> {
    for (order, id) in ids.iter().enumerate() {
        changed(
            sqlx::query(sql)
                .bind(order as i64)
                .bind(db::now())
                .bind(id)
                .execute(&mut *db)
                .await?
                .rows_affected(),
            "Item not found",
        )?;
    }
    Ok(())
}
async fn get_shopping(State(app): State<App>) -> Result<Json<ListState<ShoppingItem>>> {
    Ok(Json(shopping_list(&mut *app.db.acquire().await?).await?))
}
async fn add_shopping(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddShopping>,
) -> Result<(StatusCode, Json<ShoppingItem>)> {
    required(&body.name, "Item name is required")?;
    let mut tx = app.db.begin().await?;
    let id = db::id();
    let order:i64=sqlx::query_scalar("SELECT COALESCE(MAX(sort_order),-1)+1 FROM shopping_list_item WHERE shopping_list_id='singleton'").fetch_one(&mut *tx).await?;
    sqlx::query("INSERT INTO shopping_list_item (id,shopping_list_id,name,sort_order,created_at,updated_at) VALUES (?,'singleton',?,?,?,?)")
        .bind(&id).bind(body.name.trim()).bind(order).bind(db::now()).bind(db::now()).execute(&mut *tx).await?;
    let item = shopping_item(&mut tx, &id).await?;
    tx.commit().await?;
    let _ = app.events.send("shopping-list-changed");
    Ok((StatusCode::CREATED, Json(item)))
}
async fn toggle_shopping(
    State(app): State<App>,
    Path(id): Path<String>,
) -> Result<Json<ShoppingItem>> {
    let mut tx = app.db.begin().await?;
    changed(
        sqlx::query("UPDATE shopping_list_item SET checked=NOT checked,updated_at=? WHERE id=?")
            .bind(db::now())
            .bind(&id)
            .execute(&mut *tx)
            .await?
            .rows_affected(),
        "Item not found",
    )?;
    let item = shopping_item(&mut tx, &id).await?;
    tx.commit().await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(Json(item))
}
async fn delete_shopping(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    changed(
        sqlx::query("DELETE FROM shopping_list_item WHERE id=?")
            .bind(id)
            .execute(&app.db)
            .await?
            .rows_affected(),
        "Item not found",
    )?;
    let _ = app.events.send("shopping-list-changed");
    Ok(StatusCode::NO_CONTENT)
}
async fn reorder_shopping(
    State(app): State<App>,
    ApiJson(body): ApiJson<Reorder>,
) -> Result<Json<Success>> {
    let mut tx = app.db.begin().await?;
    reorder(
        &mut tx,
        "UPDATE shopping_list_item SET sort_order=?,updated_at=? WHERE id=?",
        &body.item_ids,
    )
    .await?;
    tx.commit().await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(success())
}
async fn archive(State(app): State<App>) -> Result<Json<ListState<ShoppingItem>>> {
    let mut tx = app.db.begin().await?;
    let list = shopping_list(&mut tx).await?;
    if !list.items.is_empty() {
        sqlx::query("INSERT INTO archived_shopping_list (id,data,created_at) VALUES (?,?,?)")
            .bind(db::id())
            .bind(sqlx::types::Json(&list.items))
            .bind(list.created_at)
            .execute(&mut *tx)
            .await?;
    }
    sqlx::query("DELETE FROM shopping_list_item WHERE shopping_list_id='singleton'")
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE shopping_list SET created_at=?,updated_at=? WHERE id='singleton'")
        .bind(db::now())
        .bind(db::now())
        .execute(&mut *tx)
        .await?;
    let list = shopping_list(&mut tx).await?;
    tx.commit().await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(Json(list))
}
async fn history(State(app): State<App>) -> Result<Json<Vec<ArchivedShoppingList>>> {
    Ok(Json(sqlx::query_as("SELECT id,data AS items,created_at FROM archived_shopping_list ORDER BY created_at DESC").fetch_all(&app.db).await?))
}
async fn delete_history(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    changed(
        sqlx::query("DELETE FROM archived_shopping_list WHERE id=?")
            .bind(id)
            .execute(&app.db)
            .await?
            .rows_affected(),
        "Archived shopping list not found",
    )?;
    Ok(StatusCode::NO_CONTENT)
}
async fn sort(State(app): State<App>) -> Result<Json<Success>> {
    integrations::sort(&app).await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(success())
}
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SortingConfig {
    pub sorting_prompt: Option<String>,
}
pub async fn config(db: &mut SqliteConnection) -> Result<SortingConfig> {
    Ok(
        sqlx::query_as("SELECT sorting_prompt FROM app_settings WHERE id='singleton'")
            .fetch_one(db)
            .await?,
    )
}
async fn get_config(State(app): State<App>) -> Result<Json<SortingConfig>> {
    Ok(Json(config(&mut *app.db.acquire().await?).await?))
}
async fn update_config(
    State(app): State<App>,
    ApiJson(body): ApiJson<UpdateConfig>,
) -> Result<Json<Success>> {
    let prompt = body
        .sorting_prompt
        .ok_or_else(|| ApiError::new(400, "sortingPrompt must be null or a non-empty string"))?;
    if prompt
        .as_deref()
        .is_some_and(|prompt| prompt.trim().is_empty())
    {
        return Err(ApiError::new(
            400,
            "sortingPrompt must be null or a non-empty string",
        ));
    }
    sqlx::query("UPDATE app_settings SET sorting_prompt=? WHERE id='singleton'")
        .bind(prompt)
        .execute(&app.db)
        .await?;
    Ok(success())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DefaultPrompt {
    default_prompt: &'static str,
}
async fn default_prompt() -> Json<DefaultPrompt> {
    Json(DefaultPrompt {
        default_prompt: integrations::default_prompt(),
    })
}
async fn get_todos(State(app): State<App>) -> Result<Json<ListState<TodoItem>>> {
    let mut db = app.db.acquire().await?;
    let created_at = sqlx::query_scalar("SELECT created_at FROM todo_list WHERE id='singleton'")
        .fetch_one(&mut *db)
        .await?;
    let items=sqlx::query_as("SELECT * FROM todo_item WHERE todo_list_id='singleton' AND (is_recurring=0 OR next_due_date IS NULL OR next_due_date<=?) ORDER BY sort_order").bind(today()).fetch_all(&mut *db).await?;
    Ok(Json(ListState { created_at, items }))
}
async fn recurring(State(app): State<App>) -> Result<Json<Vec<TodoItem>>> {
    Ok(Json(sqlx::query_as("SELECT * FROM todo_item WHERE todo_list_id='singleton' AND is_recurring=1 ORDER BY sort_order").fetch_all(&app.db).await?))
}
async fn add_todo(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddTodo>,
) -> Result<(StatusCode, Json<TodoItem>)> {
    required(&body.name, "Item name is required")?;
    validate_recurrence(body.recurrence_interval.as_deref(), body.recurrence_days)?;
    let mut tx = app.db.begin().await?;
    let id = db::id();
    let order: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order),-1)+1 FROM todo_item WHERE todo_list_id='singleton'",
    )
    .fetch_one(&mut *tx)
    .await?;
    let due = if body.is_recurring && body.recurrence_interval.is_some() {
        Some(today())
    } else {
        None
    };
    sqlx::query("INSERT INTO todo_item (id,todo_list_id,name,description,sort_order,is_recurring,recurrence_interval,recurrence_days,next_due_date,created_at,updated_at) VALUES (?,'singleton',?,?,?,?,?,?,?,?,?)")
        .bind(&id).bind(body.name.trim()).bind(description(body.description)).bind(order).bind(body.is_recurring).bind(body.recurrence_interval).bind(body.recurrence_days).bind(due).bind(db::now()).bind(db::now()).execute(&mut *tx).await?;
    let item = todo_item(&mut tx, &id).await?;
    tx.commit().await?;
    let _ = app.events.send("todo-list-changed");
    Ok((StatusCode::CREATED, Json(item)))
}
async fn toggle_todo(State(app): State<App>, Path(id): Path<String>) -> Result<Json<TodoItem>> {
    let mut tx = app.db.begin().await?;
    let item = todo_item(&mut tx, &id).await?;
    if let Some(interval) = item
        .recurrence_interval
        .as_deref()
        .filter(|_| item.is_recurring && !item.checked)
    {
        let due = next_due(
            interval,
            item.recurrence_days,
            chrono::Local::now().date_naive(),
        )?;
        sqlx::query("UPDATE todo_item SET checked=0,next_due_date=?,last_completed_at=?,updated_at=? WHERE id=?")
            .bind(due).bind(db::now()).bind(db::now()).bind(&id).execute(&mut *tx).await?;
    } else {
        sqlx::query("UPDATE todo_item SET checked=NOT checked,updated_at=? WHERE id=?")
            .bind(db::now())
            .bind(&id)
            .execute(&mut *tx)
            .await?;
    }
    let item = todo_item(&mut tx, &id).await?;
    tx.commit().await?;
    let _ = app.events.send("todo-list-changed");
    Ok(Json(item))
}
async fn update_todo(
    State(app): State<App>,
    Path(id): Path<String>,
    ApiJson(body): ApiJson<UpdateTodo>,
) -> Result<Json<TodoItem>> {
    if let Some(name) = &body.name {
        required(name, "Item name is required")?;
    }
    validate_recurrence(
        body.recurrence_interval
            .as_ref()
            .and_then(|value| value.as_deref()),
        body.recurrence_days.flatten(),
    )?;
    let mut tx = app.db.begin().await?;
    let mut item = todo_item(&mut tx, &id).await?;
    if let Some(recurring) = body.is_recurring {
        item.is_recurring = recurring;
        if recurring {
            item.recurrence_interval = body
                .recurrence_interval
                .clone()
                .flatten()
                .or(item.recurrence_interval)
                .or(Some("weekly".into()));
            if item.next_due_date.is_none() {
                item.next_due_date = Some(today());
            }
        } else {
            item.recurrence_interval = None;
            item.recurrence_days = None;
            item.next_due_date = None;
            item.last_completed_at = None;
        }
    }
    if let Some(value) = body.name {
        item.name = value;
    }
    if let Some(value) = body.description {
        item.description = description(value);
    }
    if let Some(value) = body.recurrence_interval {
        item.recurrence_interval = value;
    }
    if let Some(value) = body.recurrence_days {
        item.recurrence_days = value;
    }
    sqlx::query("UPDATE todo_item SET name=?,description=?,is_recurring=?,recurrence_interval=?,recurrence_days=?,next_due_date=?,last_completed_at=?,updated_at=? WHERE id=?")
        .bind(&item.name).bind(&item.description).bind(item.is_recurring).bind(&item.recurrence_interval).bind(item.recurrence_days).bind(&item.next_due_date).bind(&item.last_completed_at).bind(db::now()).bind(&id).execute(&mut *tx).await?;
    tx.commit().await?;
    let _ = app.events.send("todo-list-changed");
    Ok(Json(item))
}
async fn delete_todo(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    changed(
        sqlx::query("DELETE FROM todo_item WHERE id=?")
            .bind(id)
            .execute(&app.db)
            .await?
            .rows_affected(),
        "Item not found",
    )?;
    let _ = app.events.send("todo-list-changed");
    Ok(StatusCode::NO_CONTENT)
}
async fn reorder_todos(
    State(app): State<App>,
    ApiJson(body): ApiJson<Reorder>,
) -> Result<Json<Success>> {
    let mut tx = app.db.begin().await?;
    reorder(
        &mut tx,
        "UPDATE todo_item SET sort_order=?,updated_at=? WHERE id=?",
        &body.item_ids,
    )
    .await?;
    tx.commit().await?;
    let _ = app.events.send("todo-list-changed");
    Ok(success())
}
async fn clear_completed(State(app): State<App>) -> Result<Json<Success>> {
    sqlx::query(
        "DELETE FROM todo_item WHERE todo_list_id='singleton' AND checked=1 AND is_recurring=0",
    )
    .execute(&app.db)
    .await?;
    let _ = app.events.send("todo-list-changed");
    Ok(success())
}
#[derive(Deserialize)]
struct AddShopping {
    name: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reorder {
    item_ids: Vec<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateConfig {
    #[serde(default, deserialize_with = "nullable")]
    sorting_prompt: Option<Option<String>>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddTodo {
    name: String,
    description: Option<String>,
    #[serde(default)]
    is_recurring: bool,
    recurrence_interval: Option<String>,
    recurrence_days: Option<i64>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTodo {
    #[serde(default, deserialize_with = "present")]
    name: Option<String>,
    #[serde(default, deserialize_with = "nullable")]
    description: Option<Option<String>>,
    #[serde(default, deserialize_with = "present")]
    is_recurring: Option<bool>,
    #[serde(default, deserialize_with = "nullable")]
    recurrence_interval: Option<Option<String>>,
    #[serde(default, deserialize_with = "nullable")]
    recurrence_days: Option<Option<i64>>,
}
fn description(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}
fn validate_recurrence(interval: Option<&str>, days: Option<i64>) -> Result<()> {
    if interval.is_some_and(|interval| {
        !matches!(
            interval,
            "daily" | "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "custom"
        )
    }) {
        return Err(ApiError::new(400, "Invalid recurrence interval"));
    }
    if days.is_some_and(|days| days <= 0) {
        return Err(ApiError::new(
            400,
            "recurrenceDays must be a positive number of days",
        ));
    }
    Ok(())
}

pub fn next_due(interval: &str, days: Option<i64>, base: chrono::NaiveDate) -> Result<String> {
    let days = match interval {
        "daily" => 1,
        "weekly" => 7,
        "biweekly" => 14,
        "monthly" => 30,
        "bimonthly" => 60,
        "quarterly" => 90,
        "custom" => days.unwrap_or(7),
        _ => 7,
    };
    chrono::Duration::try_days(days)
        .and_then(|duration| base.checked_add_signed(duration))
        .map(|d| d.to_string())
        .ok_or_else(|| ApiError::new(400, "Date out of range"))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recurrence_matches_legacy_day_intervals() {
        let base = crate::date("2024-02-28").unwrap();
        for (interval, expected) in [
            ("daily", "2024-02-29"),
            ("weekly", "2024-03-06"),
            ("biweekly", "2024-03-13"),
            ("monthly", "2024-03-29"),
            ("bimonthly", "2024-04-28"),
            ("quarterly", "2024-05-28"),
            ("custom", "2024-03-02"),
            ("unknown", "2024-03-06"),
        ] {
            assert_eq!(next_due(interval, Some(3), base).unwrap(), expected);
        }
        assert_eq!(next_due("daily", None, base).unwrap(), "2024-02-29");
        assert_eq!(next_due("custom", None, base).unwrap(), "2024-03-06");
        assert!(next_due("custom", Some(i64::MAX), base).is_err());
    }
}
