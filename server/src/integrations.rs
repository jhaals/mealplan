use crate::{
    db, lists, meals,
    models::{MealPlan, ShoppingItem},
    today, App, Result,
};
use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::Datelike;
use serde::Serialize;
use serde_json::{json, Value};

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|s| !s.is_empty())
}
pub fn default_prompt() -> &'static str {
    if env("LANGUAGE")
        .as_deref()
        .is_some_and(|s| s.starts_with("sv"))
    {
        include_str!("prompt.sv.txt")
    } else {
        include_str!("prompt.en.txt")
    }
}
// Match each occurrence separately so duplicate names keep distinct IDs.
fn sorted_ids(items: &[ShoppingItem], names: &[Value]) -> Option<Vec<String>> {
    let mut remaining = items.to_vec();
    let mut ids = Vec::new();
    for name in names {
        let name = name.as_str()?;
        let index = remaining
            .iter()
            .position(|item| item.name.to_lowercase() == name.to_lowercase())?;
        ids.push(remaining.remove(index).id);
    }
    if remaining.is_empty() {
        Some(ids)
    } else {
        None
    }
}
pub async fn sort(app: &App) -> Result<()> {
    let (items, prompt) = {
        let mut db = app.db.acquire().await?;
        let list = lists::shopping_list(&mut db).await?;
        let config = lists::config(&mut db).await?;
        (
            list.items,
            config
                .sorting_prompt
                .unwrap_or_else(|| default_prompt().into()),
        )
    };
    let unchecked: Vec<ShoppingItem> = items.iter().filter(|item| !item.checked).cloned().collect();
    if unchecked.len() < 2 {
        return Ok(());
    }
    let fallback: Vec<String> = unchecked.iter().map(|item| item.id.clone()).collect();
    let sorted: std::result::Result<Vec<String>, String> = async {
        let key = env("OPENROUTER_API_KEY").ok_or("OPENROUTER_API_KEY is not configured".to_owned())?;
        let names: Vec<&str> = unchecked.iter().map(|item| item.name.as_str()).collect();
        let instruction = if env("LANGUAGE").as_deref() == Some("sv") { "Varor att sortera:" } else { "Items to sort:" };
        let prompt = format!("{prompt}\n\n{instruction}\n{}\n\nIMPORTANT: Return ALL {} items in the JSON object {{\"items\": [...]}}. Do not skip any items.",names.join("\n"),names.len());
        let response = app.client.post("https://openrouter.ai/api/v1/chat/completions")
            .bearer_auth(key).header("HTTP-Referer","https://github.com/jhaals/mealplan").header("X-Title","MealPlan Shopping List Sorter")
            .json(&json!({"model":env("OPENROUTER_MODEL").unwrap_or_else(||"meta-llama/llama-3.2-3b-instruct:free".into()),"messages":[{"role":"user","content":prompt}],"temperature":0,"response_format":{"type":"json_object"}}))
            .send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?.json::<Value>().await.map_err(|e| e.to_string())?;
        let content = response["choices"][0]["message"]["content"].as_str().ok_or("No response from OpenRouter")?.trim();
        let content = if let Some((_, fenced)) = content.split_once("```") { let fenced = fenced.strip_prefix("json").unwrap_or(fenced); fenced.split("```").next().unwrap().trim() } else { content };
        let parsed: Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
        let names = parsed.as_array().or_else(|| parsed["items"].as_array()).or_else(|| parsed["sortedItems"].as_array()).ok_or("Unexpected response format")?;
        sorted_ids(&unchecked,names).ok_or("AI response does not match the shopping items".into())
    }.await;
    let mut ids = match sorted {
        Ok(ids) => ids,
        Err(error) => {
            eprintln!("AI sorting: {error}");
            fallback
        }
    };
    ids.extend(
        items
            .iter()
            .filter(|item| item.checked)
            .map(|item| item.id.clone()),
    );
    let mut tx = app.db.begin().await?;
    // Items can disappear while the network request is running; never recreate them.
    for (order, id) in ids.iter().enumerate() {
        sqlx::query("UPDATE shopping_list_item SET sort_order=?,updated_at=? WHERE id=?")
            .bind(order as i64)
            .bind(db::now())
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

fn trmnl_data(plan: &MealPlan, today: &str) -> Result<(Value, String)> {
    let days: Vec<_> = plan
        .days
        .iter()
        .filter(|day| day.date.as_str() >= today)
        .collect();
    let mut stable = json!({"startDate":null,"days":[]});
    let mut variables = json!({"startDate":null,"lastUpdated":db::now(),"totalDays":0,"totalMeals":0,"days":[],"displayText":"Inga måltider planerade"});
    if plan.start_date.is_some() && !days.is_empty() {
        let mut formatted = Vec::new();
        let mut stable_days = Vec::new();
        let mut total = 0;
        let months = [
            "jan.", "feb.", "mars", "apr.", "maj", "juni", "juli", "aug.", "sep.", "okt.", "nov.",
            "dec.",
        ];
        let weekdays = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"];
        let mut display = String::new();
        for day in &days {
            let day_string = day.date.as_str();
            let date = crate::date(day_string)?;
            let label = format!("{} {}", date.day(), months[date.month0() as usize]);
            if display.is_empty() {
                display = format!("MATSEDEL - Från {label}\n\n");
            }
            let weekday = weekdays[date.weekday().num_days_from_monday() as usize];
            let names: Vec<&str> = day.meals.iter().map(|meal| meal.name.as_str()).collect();
            total += names.len();
            display.push_str(&format!("{weekday} {label}:\n"));
            for name in &names {
                display.push_str(&format!("• {}\n", name));
            }
            display.push('\n');
            stable_days.push(json!({"date":day_string,"meals":names}));
            formatted.push(json!({"date":day_string,"dayName":weekday,"formattedDate":label,"meals":names,"mealCount":names.len(),"isToday":day_string==today}));
        }
        stable = json!({"startDate":plan.start_date,"days":stable_days});
        variables = json!({"startDate":plan.start_date,"lastUpdated":db::now(),"totalDays":days.len(),"totalMeals":total,"days":formatted,"displayText":display.trim()});
    }
    let hash = db::sha256(stable.to_string().as_bytes());
    Ok((
        json!({"merge_variables":variables,"merge_strategy":"replace"}),
        hash,
    ))
}
#[derive(Debug)]
struct PushResult {
    success: bool,
    error: Option<String>,
    pushed_at: Option<String>,
}
async fn push(app: &App, force: bool) -> Result<PushResult> {
    let Some(url) = env("TRMNL_WEBHOOK_URL") else {
        return Ok(PushResult {
            success: false,
            error: Some("TRMNL webhook URL not configured".into()),
            pushed_at: None,
        });
    };
    let (payload, hash, previous) = {
        let mut db = app.db.acquire().await?;
        let plan = meals::plan(&mut db).await?;
        let (payload, hash) = trmnl_data(&plan, &today())?;
        let previous: Option<String> =
            sqlx::query_scalar("SELECT last_push_hash FROM app_settings WHERE id='singleton'")
                .fetch_one(&mut *db)
                .await?;
        (payload, hash, previous)
    };
    if !force && previous.as_deref() == Some(&hash) {
        return Ok(PushResult {
            success: true,
            error: None,
            pushed_at: None,
        });
    }
    let response = app.client.post(url).json(&payload).send().await;
    let error = match response {
        Ok(response) if response.status().is_success() => None,
        Ok(response) => Some(format!(
            "TRMNL API error: {} - {}",
            response.status(),
            response.text().await.unwrap_or_default()
        )),
        Err(error) => Some(error.to_string()),
    };
    let now = db::now();
    let pushed_at = now.clone();
    if let Some(error) = &error {
        sqlx::query("UPDATE app_settings SET last_push_error=? WHERE id='singleton'")
            .bind(error)
            .execute(&app.db)
            .await?;
    } else {
        sqlx::query("UPDATE app_settings SET last_push_hash=?,last_push_at=?,last_push_error=NULL WHERE id='singleton'")
            .bind(hash).bind(now).execute(&app.db).await?;
    }
    Ok(PushResult {
        success: error.is_none(),
        pushed_at: error.is_none().then_some(pushed_at),
        error,
    })
}

pub fn routes() -> Router<App> {
    Router::new()
        .route("/trmnl/config", get(config))
        .route("/trmnl/status", get(status))
        .route("/trmnl/push", post(manual_push))
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TrmnlConfig {
    enabled: bool,
    has_webhook_url: bool,
}
async fn config() -> Json<TrmnlConfig> {
    let enabled = env("TRMNL_WEBHOOK_URL").is_some();
    Json(TrmnlConfig {
        enabled,
        has_webhook_url: enabled,
    })
}
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct PushStatus {
    last_push_at: Option<String>,
    last_push_error: Option<String>,
    has_pushed: bool,
}
async fn status(State(app): State<App>) -> Result<Json<PushStatus>> {
    Ok(Json(sqlx::query_as("SELECT last_push_at,last_push_error,last_push_at IS NOT NULL AS has_pushed FROM app_settings WHERE id='singleton'").fetch_one(&app.db).await?))
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PushResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pushed_at: Option<String>,
}
async fn manual_push(State(app): State<App>) -> Result<(StatusCode, Json<PushResponse>)> {
    let result = push(&app, true).await?;
    let status = if result.success {
        StatusCode::OK
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    };
    Ok((
        status,
        Json(PushResponse {
            success: result.success,
            message: result.success.then_some("Successfully pushed to TRMNL"),
            error: result.error,
            pushed_at: result.pushed_at,
        }),
    ))
}
pub fn start_sync(app: App) {
    if env("TRMNL_WEBHOOK_URL").is_none() {
        return;
    }
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            match push(&app, false).await {
                Ok(result) if result.success => {}
                other => eprintln!("TRMNL sync: {other:?}"),
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sort_preserves_duplicate_ids_and_rejects_missing_items() {
        let items: Vec<_> = [("a", "Milk"), ("b", "Milk"), ("c", "Eggs")]
            .into_iter()
            .map(|(id, name)| ShoppingItem {
                id: id.into(),
                name: name.into(),
                checked: false,
                sort_order: 0,
                created_at: db::now(),
            })
            .collect();
        assert_eq!(
            sorted_ids(&items, &[json!("eggs"), json!("milk"), json!("Milk")]).unwrap(),
            ["c", "a", "b"]
        );
        assert!(sorted_ids(&items, &[json!("Eggs"), json!("Eggs"), json!("Milk")]).is_none());
    }
    #[test]
    fn trmnl_filters_past_days_and_hashes_stable_content() {
        let p = MealPlan {
            start_date: Some("2026-10-25".into()),
            current_day: None,
            days: [("2026-10-25", "Past"), ("2026-10-26", "Pasta")]
                .into_iter()
                .map(|(date, name)| crate::models::DayPlan {
                    date: date.into(),
                    meals: vec![crate::models::Meal {
                        id: "meal".into(),
                        name: name.into(),
                        created_at: db::now(),
                    }],
                })
                .collect(),
        };
        let (payload, hash) = trmnl_data(&p, "2026-10-26").unwrap();
        assert_eq!(payload["merge_variables"]["totalMeals"], 1);
        assert_eq!(payload["merge_variables"]["days"][0]["dayName"], "Mån");
        assert_eq!(
            payload["merge_variables"]["days"][0]["formattedDate"],
            "26 okt."
        );
        let legacy_json =
            r#"{"startDate":"2026-10-25","days":[{"date":"2026-10-26","meals":["Pasta"]}]}"#;
        assert_eq!(hash, db::sha256(legacy_json.as_bytes()));
        assert_eq!(hash, trmnl_data(&p, "2026-10-26").unwrap().1);
        assert_eq!(
            trmnl_data(&p, "2026-10-27").unwrap().0["merge_variables"]["totalMeals"],
            0
        );
    }
}
