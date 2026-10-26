use crate::{
    date,
    db::{self, changed, one, query, CREATED_AT_ORDER},
    models::{success, ArchivedMealPlan, DayPlan, Meal, MealPlan, Success},
    required, ApiError, ApiJson, App, Result,
};
use axum::{
    extract::{rejection::QueryRejection, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use rusqlite::{params, Connection, Row};
use serde::Deserialize;

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
fn meal(row: &Row<'_>) -> rusqlite::Result<Meal> {
    Ok(Meal {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: db::timestamp(row, 2)?,
    })
}
pub fn plan(db: &Connection) -> Result<MealPlan> {
    let mut plan = one(
        db,
        "SELECT startDate,currentDay FROM MealPlan WHERE id='singleton'",
        [],
        |row| {
            Ok(MealPlan {
                start_date: row.get(0)?,
                current_day: row.get(1)?,
                days: Vec::new(),
            })
        },
        "Meal plan not found",
    )?;
    let days = query(
        db,
        "SELECT id,date FROM DayPlan WHERE mealPlanId='singleton' ORDER BY date",
        [],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    )?;
    for (id, date) in days {
        let meals = query(
            db,
            &format!(
                "SELECT id,name,createdAt FROM Meal WHERE dayPlanId=?1 ORDER BY {CREATED_AT_ORDER}"
            ),
            [id],
            meal,
        )?;
        plan.days.push(DayPlan { date, meals });
    }
    Ok(plan)
}
fn day_id(db: &Connection, day: &str, create: bool, missing: &str) -> Result<String> {
    date(day)?;
    if create {
        db.execute("INSERT OR IGNORE INTO DayPlan (id,mealPlanId,date,createdAt,updatedAt) VALUES (?1,'singleton',?2,?3,?3)", params![db::id(),day,db::now()])?;
    }
    one(
        db,
        "SELECT id FROM DayPlan WHERE mealPlanId='singleton' AND date=?1",
        [day],
        |row| row.get(0),
        missing,
    )
}
fn shift_if_empty(db: &Connection, id: &str, day: &str) -> Result<()> {
    let count: i64 = db.query_row(
        "SELECT COUNT(*) FROM Meal WHERE dayPlanId=?1",
        [id],
        |row| row.get(0),
    )?;
    if count != 0 {
        return Ok(());
    }
    db.execute("DELETE FROM DayPlan WHERE id=?1", [id])?;
    let plan = plan(db)?;
    if plan.start_date.is_none() {
        return Ok(());
    }
    let days = query(
        db,
        "SELECT id,date FROM DayPlan WHERE mealPlanId='singleton' AND date>?1 ORDER BY date",
        [day],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    )?;
    for (id, day) in days {
        let shifted = date(&day)?
            .pred_opt()
            .ok_or_else(|| ApiError::new(400, "Date out of range"))?
            .to_string();
        db.execute(
            "UPDATE DayPlan SET date=?1,updatedAt=?2 WHERE id=?3",
            params![shifted, db::now(), id],
        )?;
    }
    if let Some(current) = plan.current_day.as_deref().filter(|current| *current > day) {
        let shifted = date(current)?
            .pred_opt()
            .ok_or_else(|| ApiError::new(400, "Date out of range"))?
            .to_string();
        db.execute(
            "UPDATE MealPlan SET currentDay=?1,updatedAt=?2 WHERE id='singleton'",
            params![shifted, db::now()],
        )?;
    }
    Ok(())
}
async fn get_plan(State(app): State<App>) -> Result<Json<MealPlan>> {
    app.database(|db| plan(db)).await.map(Json)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartDate {
    start_date: String,
}
async fn set_start(
    State(app): State<App>,
    ApiJson(body): ApiJson<StartDate>,
) -> Result<Json<MealPlan>> {
    required(&body.start_date, "Start date is required")?;
    date(&body.start_date)?;
    app.transaction(move |db| {
        db.execute(
            "UPDATE MealPlan SET startDate=?1,currentDay=?1,updatedAt=?2 WHERE id='singleton'",
            params![body.start_date, db::now()],
        )?;
        plan(db)
    })
    .await
    .map(Json)
}
async fn reset(State(app): State<App>) -> Result<StatusCode> {
    app.transaction(|db| {
        let plan = plan(db)?;
        if let (Some(start), Some(last)) = (&plan.start_date, plan.days.last()) {
            db.execute("INSERT INTO ArchivedMealPlan (id,startDate,endDate,data,createdAt) VALUES (?1,?2,?3,?4,?5)",
                params![db::id(),start,last.date,serde_json::to_string(&plan.days)?,db::now()])?;
        }
        db.execute("DELETE FROM DayPlan WHERE mealPlanId='singleton'", [])?;
        db.execute("UPDATE MealPlan SET startDate=NULL,currentDay=NULL,updatedAt=?1 WHERE id='singleton'", [db::now()])?;
        Ok(())
    }).await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn history(State(app): State<App>) -> Result<Json<Vec<ArchivedMealPlan>>> {
    app.database(|db| query(db, &format!("SELECT id,startDate,endDate,data,createdAt FROM ArchivedMealPlan ORDER BY {CREATED_AT_ORDER} DESC"), [], |row| {
        Ok(ArchivedMealPlan { id: row.get(0)?, start_date: row.get(1)?, end_date: row.get(2)?,
            days: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(), created_at: db::timestamp(row,4)? })
    })).await.map(Json)
}
async fn delete_history(State(app): State<App>, Path(id): Path<String>) -> Result<StatusCode> {
    app.transaction(move |db| {
        changed(
            db.execute("DELETE FROM ArchivedMealPlan WHERE id=?1", [id])?,
            "Archived meal plan not found",
        )
    })
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
#[derive(Deserialize)]
struct AddMeal {
    name: String,
    day: Option<String>,
}
async fn add(
    State(app): State<App>,
    ApiJson(body): ApiJson<AddMeal>,
) -> Result<(StatusCode, Json<Meal>)> {
    required(&body.name, "Meal name is required")?;
    let meal = app
        .transaction(move |db| {
            let plan = plan(db)?;
            let start = plan
                .start_date
                .as_deref()
                .ok_or_else(|| ApiError::new(400, "Start date must be set before adding meals"))?;
            let explicit = body.day.as_deref().filter(|day| !day.is_empty());
            let day = explicit.or(plan.current_day.as_deref()).unwrap_or(start);
            let day_id = day_id(db, day, true, "Day not found")?;
            let meal = Meal {
                id: db::id(),
                name: body.name,
                created_at: db::now(),
            };
            db.execute(
                "INSERT INTO Meal (id,dayPlanId,name,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?4)",
                params![meal.id, day_id, meal.name, meal.created_at],
            )?;
            if explicit.is_none() {
                let next = date(day)?
                    .succ_opt()
                    .ok_or_else(|| ApiError::new(400, "Date out of range"))?
                    .to_string();
                db.execute(
                    "UPDATE MealPlan SET currentDay=?1,updatedAt=?2 WHERE id='singleton'",
                    params![next, meal.created_at],
                )?;
            }
            Ok(meal)
        })
        .await?;
    Ok((StatusCode::CREATED, Json(meal)))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SwapMeals {
    meal1_id: String,
    meal1_day: String,
    meal2_id: String,
    meal2_day: String,
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
    app.transaction(move |db| {
        let day1 = day_id(db, &body.meal1_day, false, "One or both days not found")?;
        let day2 = day_id(db, &body.meal2_day, false, "One or both days not found")?;
        one(
            db,
            "SELECT id FROM Meal WHERE id=?1 AND dayPlanId=?2",
            params![body.meal1_id, day1],
            |row| row.get::<_, String>(0),
            "Meal not found",
        )?;
        one(
            db,
            "SELECT id FROM Meal WHERE id=?1 AND dayPlanId=?2",
            params![body.meal2_id, day2],
            |row| row.get::<_, String>(0),
            "Meal not found",
        )?;
        db.execute(
            "UPDATE Meal SET dayPlanId=?1,updatedAt=?2 WHERE id=?3",
            params![day2, db::now(), body.meal1_id],
        )?;
        db.execute(
            "UPDATE Meal SET dayPlanId=?1,updatedAt=?2 WHERE id=?3",
            params![day1, db::now(), body.meal2_id],
        )?;
        Ok(())
    })
    .await?;
    Ok(success())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveMeal {
    source_day: String,
    target_day: String,
}
async fn move_meal(
    State(app): State<App>,
    Path(id): Path<String>,
    ApiJson(body): ApiJson<MoveMeal>,
) -> Result<Json<Success>> {
    required(&body.source_day, "Source day and target day are required")?;
    required(&body.target_day, "Source day and target day are required")?;
    app.transaction(move |db| {
        let source = day_id(db, &body.source_day, false, "Source day not found")?;
        one(
            db,
            "SELECT id FROM Meal WHERE id=?1 AND dayPlanId=?2",
            params![id, source],
            |row| row.get::<_, String>(0),
            "Meal not found",
        )?;
        let target = day_id(db, &body.target_day, true, "Day not found")?;
        db.execute(
            "UPDATE Meal SET dayPlanId=?1,updatedAt=?2 WHERE id=?3",
            params![target, db::now(), id],
        )?;
        shift_if_empty(db, &source, &body.source_day)
    })
    .await?;
    Ok(success())
}
#[derive(Deserialize)]
struct DayQuery {
    day: Option<String>,
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
    app.transaction(move |db| {
        let day_id = day_id(db, &day, false, "Day not found")?;
        changed(
            db.execute(
                "DELETE FROM Meal WHERE id=?1 AND dayPlanId=?2",
                params![id, day_id],
            )?,
            "Meal not found",
        )?;
        shift_if_empty(db, &day_id, &day)
    })
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
