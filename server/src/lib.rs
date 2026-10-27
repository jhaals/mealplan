pub mod db;
mod integrations;
mod lists;
mod meals;
mod models;

use axum::{
    extract::{rejection::JsonRejection, DefaultBodyLimit, FromRequest, Request, State},
    http::StatusCode,
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::SqlitePool;
use std::{convert::Infallible, time::Duration};
use tokio::sync::broadcast;
use tower_http::services::{ServeDir, ServeFile};

pub type Result<T> = std::result::Result<T, ApiError>;
#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}
impl ApiError {
    pub fn new(status: u16, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::from_u16(status).unwrap(),
            message: message.into(),
        }
    }
    pub fn internal(message: impl Into<String>) -> Self {
        eprintln!("{}", message.into());
        Self::new(500, "Internal server error")
    }
}
impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.message.fmt(f)
    }
}
impl std::error::Error for ApiError {}
impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => Self::new(404, "Item not found"),
            error => Self::internal(error.to_string()),
        }
    }
}
impl From<sqlx::migrate::MigrateError> for ApiError {
    fn from(error: sqlx::migrate::MigrateError) -> Self {
        Self::internal(error.to_string())
    }
}
impl From<serde_json::Error> for ApiError {
    fn from(error: serde_json::Error) -> Self {
        Self::internal(error.to_string())
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({"error":{"message":self.message,"statusCode":self.status.as_u16()}})),
        )
            .into_response()
    }
}

// Keep the existing JSON error envelope for Axum's typed JSON rejections.
pub struct ApiJson<T>(pub T);
impl<S, T> FromRequest<S> for ApiJson<T>
where
    S: Send + Sync,
    Json<T>: FromRequest<S, Rejection = JsonRejection>,
{
    type Rejection = ApiError;
    async fn from_request(request: Request, state: &S) -> Result<Self> {
        Json::<T>::from_request(request, state)
            .await
            .map(|Json(body)| Self(body))
            .map_err(|error| ApiError::new(400, error.body_text()))
    }
}

#[derive(Clone)]
pub struct App {
    pub db: SqlitePool,
    pub events: broadcast::Sender<&'static str>,
    pub client: reqwest::Client,
}
impl App {
    pub async fn connect(url: &str) -> Result<Self> {
        Ok(Self {
            db: db::connect(url).await?,
            events: broadcast::channel(128).0,
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|error| ApiError::internal(error.to_string()))?,
        })
    }
}

pub fn required<'a>(value: &'a str, message: &str) -> Result<&'a str> {
    if value.is_empty() {
        Err(ApiError::new(400, message))
    } else {
        Ok(value)
    }
}
pub fn date(value: &str) -> Result<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .filter(|date| date.to_string() == value)
        .ok_or_else(|| ApiError::new(400, "Date must be YYYY-MM-DD"))
}
pub fn today() -> String {
    chrono::Local::now().date_naive().to_string()
}

// Missing fields keep their old value; an explicit null clears nullable fields.
pub fn nullable<'de, D, T>(deserializer: D) -> std::result::Result<Option<Option<T>>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

pub fn present<'de, D, T>(deserializer: D) -> std::result::Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(deserializer).map(Some)
}

pub fn router(app: App, dist: &str) -> Router {
    let api = Router::new()
        .merge(meals::routes())
        .merge(lists::routes())
        .merge(integrations::routes())
        .route("/shopping-list/events", get(events))
        .route("/todo-list/events", get(events))
        .route("/config/language", get(language))
        .fallback(|| async { ApiError::new(404, "Not found") })
        .method_not_allowed_fallback(|| async { ApiError::new(405, "Method not allowed") });
    Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .fallback_service(
            ServeDir::new(dist).fallback(ServeFile::new(format!("{dist}/index.html"))),
        )
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .with_state(app)
}
#[derive(Serialize)]
struct Health {
    status: &'static str,
    timestamp: String,
}
async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        timestamp: db::now(),
    })
}
#[derive(Serialize)]
struct Language {
    language: String,
}
async fn language() -> Json<Language> {
    Json(Language {
        language: std::env::var("LANGUAGE")
            .ok()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "en".into()),
    })
}
async fn events(State(app): State<App>) -> impl IntoResponse {
    let mut receiver = app.events.subscribe();
    let stream = async_stream::stream! {
        yield Ok::<_, Infallible>(Event::default().event("connected").data(json!({"clientId":db::id(),"timestamp":db::now()}).to_string()));
        loop {
            let event = match receiver.recv().await {
                Ok(event) => event,
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    yield Ok(Event::default().event("shopping-list-changed").data(json!({"type":"shopping-list-changed","timestamp":db::now()}).to_string()));
                    "todo-list-changed"
                },
                Err(broadcast::error::RecvError::Closed) => break,
            };
            yield Ok(Event::default().event(event).data(json!({"type":event,"timestamp":db::now()}).to_string()));
        }
    };
    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(30)))
}
pub use integrations::start_sync;
