use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meal {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DayPlan {
    pub date: String,
    pub meals: Vec<Meal>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealPlan {
    pub start_date: Option<String>,
    pub current_day: Option<String>,
    pub days: Vec<DayPlan>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedMealPlan {
    pub id: String,
    pub start_date: String,
    pub end_date: String,
    pub days: Vec<DayPlan>,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingItem {
    pub id: String,
    pub name: String,
    pub checked: bool,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub checked: bool,
    pub sort_order: i64,
    pub is_recurring: bool,
    pub recurrence_interval: Option<String>,
    pub recurrence_days: Option<i64>,
    pub next_due_date: Option<String>,
    pub last_completed_at: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListState<T> {
    pub items: Vec<T>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedShoppingList {
    pub id: String,
    pub items: Vec<ShoppingItem>,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct Success {
    pub success: bool,
}

pub fn success() -> axum::Json<Success> {
    axum::Json(Success { success: true })
}
