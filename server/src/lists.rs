use crate::{
    db::{self, changed, one, query, CREATED_AT_ORDER},
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
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

const SHOP_FIELDS: &str = "id,name,checked,sortOrder,createdAt";
const TODO_FIELDS: &str = "id,name,description,checked,sortOrder,isRecurring,recurrenceInterval,recurrenceDays,nextDueDate,lastCompletedAt,createdAt";

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
fn shopping_row(row: &Row<'_>) -> rusqlite::Result<ShoppingItem> {
    Ok(ShoppingItem {
        id: row.get(0)?,
        name: row.get(1)?,
        checked: row.get(2)?,
        sort_order: row.get(3)?,
        created_at: db::timestamp(row, 4)?,
    })
}
fn todo_row(row: &Row<'_>) -> rusqlite::Result<TodoItem> {
    Ok(TodoItem {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        checked: row.get(3)?,
        sort_order: row.get(4)?,
        is_recurring: row.get(5)?,
        recurrence_interval: row.get(6)?,
        recurrence_days: row.get(7)?,
        next_due_date: row.get(8)?,
        last_completed_at: db::optional_timestamp(row, 9)?,
        created_at: db::timestamp(row, 10)?,
    })
}
fn created_at(db: &Connection, table: &str) -> Result<String> {
    one(
        db,
        &format!("SELECT createdAt FROM {table} WHERE id='singleton'"),
        [],
        |row| db::timestamp(row, 0),
        "List not found",
    )
}
pub fn shopping_list(db: &Connection) -> Result<ListState<ShoppingItem>> {
    Ok(ListState { created_at: created_at(db,"ShoppingList")?, items: query(db,&format!("SELECT {SHOP_FIELDS} FROM ShoppingListItem WHERE shoppingListId='singleton' ORDER BY sortOrder"),[],shopping_row)? })
}
fn shopping_item(db: &Connection, id: &str) -> Result<ShoppingItem> {
    one(
        db,
        &format!("SELECT {SHOP_FIELDS} FROM ShoppingListItem WHERE id=?1"),
        [id],
        shopping_row,
        "Item not found",
    )
}
fn todo_item(db: &Connection, id: &str) -> Result<TodoItem> {
    one(
        db,
        &format!("SELECT {TODO_FIELDS} FROM TodoItem WHERE id=?1"),
        [id],
        todo_row,
        "Item not found",
    )
}
fn next_order(db: &Connection, table: &str, foreign_key: &str) -> Result<i64> {
    Ok(db.query_row(
        &format!(
            "SELECT COALESCE(MAX(sortOrder),-1)+1 FROM {table} WHERE {foreign_key}='singleton'"
        ),
        [],
        |row| row.get(0),
    )?)
}
fn reorder(db: &Connection, table: &str, ids: &[String]) -> Result<()> {
    for (order, id) in ids.iter().enumerate() {
        changed(
            db.execute(
                &format!("UPDATE {table} SET sortOrder=?1,updatedAt=?2 WHERE id=?3"),
                params![order as i64, db::now(), id],
            )?,
            "Item not found",
        )?;
    }
    Ok(())
}
fn remove(db: &Connection, table: &str, id: &str) -> Result<()> {
    changed(
        db.execute(&format!("DELETE FROM {table} WHERE id=?1"), [id])?,
        "Item not found",
    )
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
async fn get_shopping(State(app): State<App>) -> Result<Json<ListState<ShoppingItem>>> {
    app.database(|db| shopping_list(db)).await.map(Json)
}
#[derive(Deserialize)]
struct AddShopping {
    name: String,
}
async fn add_shopping(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddShopping>,
) -> Result<(StatusCode, Json<ShoppingItem>)> {
    required(&body.name, "Item name is required")?;
    let item = app.transaction(move |db| {
        let id = db::id();
        let order = next_order(db,"ShoppingListItem","shoppingListId")?;
        db.execute("INSERT INTO ShoppingListItem (id,shoppingListId,name,sortOrder,createdAt,updatedAt) VALUES (?1,'singleton',?2,?3,?4,?4)",params![id,body.name.trim(),order,db::now()])?;
        shopping_item(db,&id)
    }).await?;
    let _ = app.events.send("shopping-list-changed");
    Ok((StatusCode::CREATED, Json(item)))
}
async fn toggle_shopping(
    State(app): State<App>,
    Path(id): Path<String>,
) -> Result<Json<ShoppingItem>> {
    let item = app
        .transaction(move |db| {
            changed(
                db.execute(
                    "UPDATE ShoppingListItem SET checked=NOT checked,updatedAt=?1 WHERE id=?2",
                    params![db::now(), id],
                )?,
                "Item not found",
            )?;
            shopping_item(db, &id)
        })
        .await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(Json(item))
}
async fn delete_shopping(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    app.transaction(move |db| remove(db, "ShoppingListItem", &id))
        .await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(StatusCode::NO_CONTENT)
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reorder {
    item_ids: Vec<String>,
}
async fn reorder_shopping(
    State(app): State<App>,
    ApiJson(body): ApiJson<Reorder>,
) -> Result<Json<Success>> {
    app.transaction(move |db| reorder(db, "ShoppingListItem", &body.item_ids))
        .await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(success())
}
async fn archive(State(app): State<App>) -> Result<Json<ListState<ShoppingItem>>> {
    let list = app
        .transaction(|db| {
            let list = shopping_list(db)?;
            if !list.items.is_empty() {
                db.execute(
                    "INSERT INTO ArchivedShoppingList (id,data,createdAt) VALUES (?1,?2,?3)",
                    params![
                        db::id(),
                        serde_json::to_string(&list.items)?,
                        list.created_at
                    ],
                )?;
            }
            db.execute(
                "DELETE FROM ShoppingListItem WHERE shoppingListId='singleton'",
                [],
            )?;
            db.execute(
                "UPDATE ShoppingList SET createdAt=?1,updatedAt=?1 WHERE id='singleton'",
                [db::now()],
            )?;
            shopping_list(db)
        })
        .await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(Json(list))
}
async fn history(State(app): State<App>) -> Result<Json<Vec<ArchivedShoppingList>>> {
    app.database(|db| query(db,&format!("SELECT id,data,createdAt FROM ArchivedShoppingList ORDER BY {CREATED_AT_ORDER} DESC"),[],|row| {
        Ok(ArchivedShoppingList { id: row.get(0)?, items: serde_json::from_str(&row.get::<_,String>(1)?).unwrap_or_default(), created_at: db::timestamp(row,2)? })
    })).await.map(Json)
}
async fn delete_history(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    app.transaction(move |db| {
        changed(
            db.execute("DELETE FROM ArchivedShoppingList WHERE id=?1", [id])?,
            "Archived shopping list not found",
        )
    })
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn sort(State(app): State<App>) -> Result<Json<Success>> {
    integrations::sort(&app).await?;
    let _ = app.events.send("shopping-list-changed");
    Ok(success())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SortingConfig {
    pub sorting_prompt: Option<String>,
}
pub fn config(db: &Connection) -> Result<SortingConfig> {
    one(
        db,
        "SELECT sortingPrompt FROM MealPlan WHERE id='singleton'",
        [],
        |row| {
            Ok(SortingConfig {
                sorting_prompt: row.get(0)?,
            })
        },
        "Meal plan not found",
    )
}
async fn get_config(State(app): State<App>) -> Result<Json<SortingConfig>> {
    app.database(|db| config(db)).await.map(Json)
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateConfig {
    #[serde(default, deserialize_with = "nullable")]
    sorting_prompt: Option<Option<String>>,
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
    app.transaction(move |db| {
        db.execute(
            "UPDATE MealPlan SET sortingPrompt=?1,updatedAt=?2 WHERE id='singleton'",
            params![prompt, db::now()],
        )?;
        Ok(())
    })
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
    app.database(|db| Ok(ListState { created_at: created_at(db,"TodoList")?,
        items: query(db,&format!("SELECT {TODO_FIELDS} FROM TodoItem WHERE todoListId='singleton' AND (isRecurring=0 OR nextDueDate IS NULL OR nextDueDate<=?1) ORDER BY sortOrder"),[today()],todo_row)?
    })).await.map(Json)
}
async fn recurring(State(app): State<App>) -> Result<Json<Vec<TodoItem>>> {
    app.database(|db| query(db,&format!("SELECT {TODO_FIELDS} FROM TodoItem WHERE todoListId='singleton' AND isRecurring=1 ORDER BY sortOrder"),[],todo_row)).await.map(Json)
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
async fn add_todo(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddTodo>,
) -> Result<(StatusCode, Json<TodoItem>)> {
    required(&body.name, "Item name is required")?;
    validate_recurrence(body.recurrence_interval.as_deref(), body.recurrence_days)?;
    let item = app.transaction(move |db| {
        let id = db::id();
        let order = next_order(db,"TodoItem","todoListId")?;
        let due = if body.is_recurring && body.recurrence_interval.is_some() { Some(today()) } else { None };
        db.execute("INSERT INTO TodoItem (id,todoListId,name,description,sortOrder,isRecurring,recurrenceInterval,recurrenceDays,nextDueDate,createdAt,updatedAt) VALUES (?1,'singleton',?2,?3,?4,?5,?6,?7,?8,?9,?9)",
            params![id,body.name.trim(),description(body.description),order,body.is_recurring,body.recurrence_interval,body.recurrence_days,due,db::now()])?;
        todo_item(db,&id)
    }).await?;
    let _ = app.events.send("todo-list-changed");
    Ok((StatusCode::CREATED, Json(item)))
}
async fn toggle_todo(State(app): State<App>, Path(id): Path<String>) -> Result<Json<TodoItem>> {
    let item = app.transaction(move |db| {
        let item = todo_item(db,&id)?;
        if let Some(interval) = item.recurrence_interval.as_deref().filter(|_| item.is_recurring && !item.checked) {
            let due = next_due(interval,item.recurrence_days,chrono::Local::now().date_naive())?;
            db.execute("UPDATE TodoItem SET checked=0,nextDueDate=?1,lastCompletedAt=?2,updatedAt=?2 WHERE id=?3",params![due,db::now(),id])?;
        } else {
            db.execute("UPDATE TodoItem SET checked=NOT checked,updatedAt=?1 WHERE id=?2",params![db::now(),id])?;
        }
        todo_item(db,&id)
    }).await?;
    let _ = app.events.send("todo-list-changed");
    Ok(Json(item))
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
    let item = app.transaction(move |db| {
        let mut item = todo_item(db,&id)?;
        if let Some(recurring) = body.is_recurring {
            item.is_recurring = recurring;
            if recurring {
                item.recurrence_interval = body.recurrence_interval.clone().flatten().or(item.recurrence_interval).or(Some("weekly".into()));
                if item.next_due_date.is_none() { item.next_due_date = Some(today()); }
            } else {
                item.recurrence_interval = None;
                item.recurrence_days = None;
                item.next_due_date = None;
                item.last_completed_at = None;
            }
        }
        if let Some(name) = body.name { item.name = name; }
        if let Some(value) = body.description { item.description = description(value); }
        if let Some(value) = body.recurrence_interval { item.recurrence_interval = value; }
        if let Some(value) = body.recurrence_days { item.recurrence_days = value; }
        db.execute("UPDATE TodoItem SET name=?1,description=?2,isRecurring=?3,recurrenceInterval=?4,recurrenceDays=?5,nextDueDate=?6,lastCompletedAt=?7,updatedAt=?8 WHERE id=?9",
            params![item.name,item.description,item.is_recurring,item.recurrence_interval,item.recurrence_days,item.next_due_date,item.last_completed_at,db::now(),id])?;
        todo_item(db,&id)
    }).await?;
    let _ = app.events.send("todo-list-changed");
    Ok(Json(item))
}
async fn delete_todo(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    app.transaction(move |db| remove(db, "TodoItem", &id))
        .await?;
    let _ = app.events.send("todo-list-changed");
    Ok(StatusCode::NO_CONTENT)
}
async fn reorder_todos(
    State(app): State<App>,
    ApiJson(body): ApiJson<Reorder>,
) -> Result<Json<Success>> {
    app.transaction(move |db| reorder(db, "TodoItem", &body.item_ids))
        .await?;
    let _ = app.events.send("todo-list-changed");
    Ok(success())
}
async fn clear_completed(State(app): State<App>) -> Result<Json<Success>> {
    app.transaction(|db| {
        db.execute(
            "DELETE FROM TodoItem WHERE todoListId='singleton' AND checked=1 AND isRecurring=0",
            [],
        )?;
        Ok(())
    })
    .await?;
    let _ = app.events.send("todo-list-changed");
    Ok(success())
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
