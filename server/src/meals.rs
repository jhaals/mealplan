use crate::{
    date,
    db::{self, changed},
    models::{success, ArchivedMealPlan, DayPlan, Meal, MealPlan, Success},
    required, ApiError, ApiJson, App, Result,
};
use axum::{
    extract::{rejection::QueryRejection, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use sqlx::SqliteConnection;

pub fn routes() -> Router<App> {
    Router::new()
        .route("/meal-plan", get(get_plan).delete(reset))
        .route("/meal-plan/start-date", put(set_start))
        .route("/meal-plan/history", get(history))
        .route("/meal-plan/history/{id}", delete(delete_history))
        .route("/meal-plan/meals", post(add))
        .route("/meal-plan/meals/swap", put(swap))
        .route("/meal-plan/meals/{id}", delete(remove))
        .route("/meal-plan/meals/{id}/move", put(move_meal))
}
pub async fn plan(db: &mut SqliteConnection) -> Result<MealPlan> {
    let mut plan: MealPlan =
        sqlx::query_as("SELECT start_date,current_day FROM meal_plan WHERE id='singleton'")
            .fetch_one(&mut *db)
            .await?;
    let days: Vec<(String, String)> =
        sqlx::query_as("SELECT id,date FROM day_plan WHERE meal_plan_id='singleton' ORDER BY date")
            .fetch_all(&mut *db)
            .await?;
    for (id, date) in days {
        let meals = sqlx::query_as(
            "SELECT id,name,created_at FROM meal WHERE day_plan_id=? ORDER BY created_at",
        )
        .bind(id)
        .fetch_all(&mut *db)
        .await?;
        plan.days.push(DayPlan { date, meals });
    }
    Ok(plan)
}
async fn day_id(
    db: &mut SqliteConnection,
    day: &str,
    create: bool,
    missing: &str,
) -> Result<String> {
    date(day)?;
    if create {
        sqlx::query("INSERT OR IGNORE INTO day_plan (id,meal_plan_id,date,created_at,updated_at) VALUES (?,'singleton',?,?,?)")
            .bind(db::id()).bind(day).bind(db::now()).bind(db::now()).execute(&mut *db).await?;
    }
    sqlx::query_scalar("SELECT id FROM day_plan WHERE meal_plan_id='singleton' AND date=?")
        .bind(day)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| ApiError::new(404, missing))
}
async fn shift_if_empty(db: &mut SqliteConnection, id: &str, day: &str) -> Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM meal WHERE day_plan_id=?")
        .bind(id)
        .fetch_one(&mut *db)
        .await?;
    if count != 0 {
        return Ok(());
    }
    sqlx::query("DELETE FROM day_plan WHERE id=?")
        .bind(id)
        .execute(&mut *db)
        .await?;
    let plan = plan(db).await?;
    if plan.start_date.is_none() {
        return Ok(());
    }
    let days: Vec<(String, String)> = sqlx::query_as(
        "SELECT id,date FROM day_plan WHERE meal_plan_id='singleton' AND date>? ORDER BY date",
    )
    .bind(day)
    .fetch_all(&mut *db)
    .await?;
    for (id, day) in days {
        let shifted = date(&day)?
            .pred_opt()
            .ok_or_else(|| ApiError::new(400, "Date out of range"))?
            .to_string();
        sqlx::query("UPDATE day_plan SET date=?,updated_at=? WHERE id=?")
            .bind(shifted)
            .bind(db::now())
            .bind(id)
            .execute(&mut *db)
            .await?;
    }
    if let Some(current) = plan.current_day.as_deref().filter(|current| *current > day) {
        let shifted = date(current)?
            .pred_opt()
            .ok_or_else(|| ApiError::new(400, "Date out of range"))?
            .to_string();
        sqlx::query("UPDATE meal_plan SET current_day=?,updated_at=? WHERE id='singleton'")
            .bind(shifted)
            .bind(db::now())
            .execute(db)
            .await?;
    }
    Ok(())
}
async fn get_plan(State(app): State<App>) -> Result<Json<MealPlan>> {
    Ok(Json(plan(&mut *app.db.acquire().await?).await?))
}
async fn set_start(
    State(app): State<App>,
    ApiJson(body): ApiJson<StartDate>,
) -> Result<Json<MealPlan>> {
    required(&body.start_date, "Start date is required")?;
    date(&body.start_date)?;
    let mut tx = app.db.begin().await?;
    sqlx::query(
        "UPDATE meal_plan SET start_date=?,current_day=?,updated_at=? WHERE id='singleton'",
    )
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(db::now())
    .execute(&mut *tx)
    .await?;
    let plan = plan(&mut tx).await?;
    tx.commit().await?;
    Ok(Json(plan))
}
async fn reset(State(app): State<App>) -> Result<StatusCode> {
    let mut tx = app.db.begin().await?;
    let plan = plan(&mut tx).await?;
    if let (Some(start), Some(last)) = (&plan.start_date, plan.days.last()) {
        sqlx::query("INSERT INTO archived_meal_plan (id,start_date,end_date,data,created_at) VALUES (?,?,?,?,?)")
            .bind(db::id()).bind(start).bind(&last.date).bind(sqlx::types::Json(&plan.days)).bind(db::now()).execute(&mut *tx).await?;
    }
    sqlx::query("DELETE FROM day_plan WHERE meal_plan_id='singleton'")
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "UPDATE meal_plan SET start_date=NULL,current_day=NULL,updated_at=? WHERE id='singleton'",
    )
    .bind(db::now())
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn history(State(app): State<App>) -> Result<Json<Vec<ArchivedMealPlan>>> {
    Ok(Json(sqlx::query_as("SELECT id,start_date,end_date,data AS days,created_at FROM archived_meal_plan ORDER BY created_at DESC").fetch_all(&app.db).await?))
}
async fn delete_history(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    changed(
        sqlx::query("DELETE FROM archived_meal_plan WHERE id=?")
            .bind(id)
            .execute(&app.db)
            .await?
            .rows_affected(),
        "Archived meal plan not found",
    )?;
    Ok(StatusCode::NO_CONTENT)
}
async fn add(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddMeal>,
) -> Result<(StatusCode, Json<Meal>)> {
    required(&body.name, "Meal name is required")?;
    let mut tx = app.db.begin().await?;
    let plan = plan(&mut tx).await?;
    let start = plan
        .start_date
        .as_deref()
        .ok_or_else(|| ApiError::new(400, "Start date must be set before adding meals"))?;
    let explicit = body.day.as_deref().filter(|day| !day.is_empty());
    let day = explicit.or(plan.current_day.as_deref()).unwrap_or(start);
    let day_id = day_id(&mut tx, day, true, "Day not found").await?;
    let meal = Meal {
        id: db::id(),
        name: body.name,
        created_at: db::now(),
    };
    sqlx::query("INSERT INTO meal (id,day_plan_id,name,created_at,updated_at) VALUES (?,?,?,?,?)")
        .bind(&meal.id)
        .bind(day_id)
        .bind(&meal.name)
        .bind(&meal.created_at)
        .bind(&meal.created_at)
        .execute(&mut *tx)
        .await?;
    if explicit.is_none() {
        let next = date(day)?
            .succ_opt()
            .ok_or_else(|| ApiError::new(400, "Date out of range"))?
            .to_string();
        sqlx::query("UPDATE meal_plan SET current_day=?,updated_at=? WHERE id='singleton'")
            .bind(next)
            .bind(&meal.created_at)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(meal)))
}
async fn swap(State(app): State<App>, ApiJson(body): ApiJson<SwapMeals>) -> Result<Json<Success>> {
    for value in [
        &body.meal1_id,
        &body.meal1_day,
        &body.meal2_id,
        &body.meal2_day,
    ] {
        required(value, "All meal IDs and days are required")?;
    }
    let mut tx = app.db.begin().await?;
    let day1 = day_id(
        &mut tx,
        &body.meal1_day,
        false,
        "One or both days not found",
    )
    .await?;
    let day2 = day_id(
        &mut tx,
        &body.meal2_day,
        false,
        "One or both days not found",
    )
    .await?;
    for (id, day) in [(&body.meal1_id, &day1), (&body.meal2_id, &day2)] {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM meal WHERE id=? AND day_plan_id=?)")
                .bind(id)
                .bind(day)
                .fetch_one(&mut *tx)
                .await?;
        if !exists {
            return Err(ApiError::new(404, "Meal not found"));
        }
    }
    sqlx::query("UPDATE meal SET day_plan_id=?,updated_at=? WHERE id=?")
        .bind(day2)
        .bind(db::now())
        .bind(body.meal1_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE meal SET day_plan_id=?,updated_at=? WHERE id=?")
        .bind(day1)
        .bind(db::now())
        .bind(body.meal2_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(success())
}
async fn move_meal(
    State(app): State<App>,
    Path(id): Path<String>,
    ApiJson(body): ApiJson<MoveMeal>,
) -> Result<Json<Success>> {
    required(&body.source_day, "Source day and target day are required")?;
    required(&body.target_day, "Source day and target day are required")?;
    let mut tx = app.db.begin().await?;
    let source = day_id(&mut tx, &body.source_day, false, "Source day not found").await?;
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM meal WHERE id=? AND day_plan_id=?)")
            .bind(&id)
            .bind(&source)
            .fetch_one(&mut *tx)
            .await?;
    if !exists {
        return Err(ApiError::new(404, "Meal not found"));
    }
    let target = day_id(&mut tx, &body.target_day, true, "Day not found").await?;
    sqlx::query("UPDATE meal SET day_plan_id=?,updated_at=? WHERE id=?")
        .bind(target)
        .bind(db::now())
        .bind(id)
        .execute(&mut *tx)
        .await?;
    shift_if_empty(&mut tx, &source, &body.source_day).await?;
    tx.commit().await?;
    Ok(success())
}
async fn remove(
    State(app): State<App>,
    Path(id): Path<String>,
    query: std::result::Result<Query<DayQuery>, QueryRejection>,
) -> Result<StatusCode> {
    let Query(query) = query.map_err(|_| ApiError::new(400, "Invalid query"))?;
    let day = query
        .day
        .filter(|day| !day.is_empty())
        .ok_or_else(|| ApiError::new(400, "Day query parameter is required"))?;
    let mut tx = app.db.begin().await?;
    let day_id = day_id(&mut tx, &day, false, "Day not found").await?;
    changed(
        sqlx::query("DELETE FROM meal WHERE id=? AND day_plan_id=?")
            .bind(id)
            .bind(&day_id)
            .execute(&mut *tx)
            .await?
            .rows_affected(),
        "Meal not found",
    )?;
    shift_if_empty(&mut tx, &day_id, &day).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartDate {
    start_date: String,
}
#[derive(Deserialize)]
struct AddMeal {
    name: String,
    day: Option<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SwapMeals {
    meal1_id: String,
    meal1_day: String,
    meal2_id: String,
    meal2_day: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveMeal {
    source_day: String,
    target_day: String,
}
#[derive(Deserialize)]
struct DayQuery {
    day: Option<String>,
}
