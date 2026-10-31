use axum::{
    body::{to_bytes, Body},
    http::Request,
};
use mealplan_server::{router, App};
use serde_json::{json, Value};
use tower::ServiceExt;

async fn request(app: &App, method: &str, path: &str, body: Value) -> (u16, Value) {
    let response = router(app.clone(), "/nonexistent")
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status().as_u16();
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let data = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap()
    };
    (status, data)
}

async fn ok(app: &App, method: &str, path: &str, body: Value) -> Value {
    let (status, data) = request(app, method, path, body).await;
    assert!(
        (200..300).contains(&status),
        "{method} {path}: {status} {data}"
    );
    data
}

async fn app() -> App {
    App::connect("sqlite::memory:").await.unwrap()
}

#[tokio::test]
async fn health_reports_ok_with_timestamp() {
    let (status, body) = request(&app().await, "GET", "/health", json!({})).await;
    assert_eq!(status, 200);
    assert_eq!(body["status"], "ok");
    assert!(body["timestamp"].as_str().unwrap().ends_with('Z'));
}

#[tokio::test]
async fn unknown_api_routes_and_methods_return_json_errors() {
    let app = app().await;
    let (status, body) = request(&app, "GET", "/api/nope", json!({})).await;
    assert_eq!(
        (status, &body["error"]["message"]),
        (404, &json!("Not found"))
    );
    let (status, body) = request(&app, "PATCH", "/api/shopping-list", json!({})).await;
    assert_eq!(status, 405);
    assert!(body["error"]["message"].is_string());
}

#[tokio::test]
async fn shopping_items_toggle_delete_and_history_removal() {
    let app = app().await;
    let item = ok(
        &app,
        "POST",
        "/api/shopping-list/items",
        json!({"name":"Bread"}),
    )
    .await;
    let id = item["id"].as_str().unwrap().to_string();
    assert_eq!(item["checked"], false);

    let toggled = ok(
        &app,
        "PUT",
        &format!("/api/shopping-list/items/{id}/toggle"),
        json!({}),
    )
    .await;
    assert_eq!(toggled["checked"], true);
    let toggled = ok(
        &app,
        "PUT",
        &format!("/api/shopping-list/items/{id}/toggle"),
        json!({}),
    )
    .await;
    assert_eq!(toggled["checked"], false);

    assert_eq!(
        request(
            &app,
            "POST",
            "/api/shopping-list/items",
            json!({"name":"   "})
        )
        .await
        .0,
        400
    );
    ok(
        &app,
        "DELETE",
        &format!("/api/shopping-list/items/{id}"),
        json!({}),
    )
    .await;
    assert_eq!(
        request(
            &app,
            "DELETE",
            &format!("/api/shopping-list/items/{id}"),
            json!({})
        )
        .await
        .0,
        404
    );
    assert_eq!(
        request(
            &app,
            "PUT",
            &format!("/api/shopping-list/items/{id}/toggle"),
            json!({})
        )
        .await
        .0,
        404
    );

    ok(
        &app,
        "POST",
        "/api/shopping-list/items",
        json!({"name":"Tea"}),
    )
    .await;
    ok(&app, "POST", "/api/shopping-list/archive", json!({})).await;
    let history = ok(&app, "GET", "/api/shopping-list/history", json!({})).await;
    let history_id = history[0]["id"].as_str().unwrap().to_string();
    ok(
        &app,
        "DELETE",
        &format!("/api/shopping-list/history/{history_id}"),
        json!({}),
    )
    .await;
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/history", json!({})).await,
        json!([])
    );
    assert_eq!(
        request(
            &app,
            "DELETE",
            &format!("/api/shopping-list/history/{history_id}"),
            json!({})
        )
        .await
        .0,
        404
    );
}

#[tokio::test]
async fn sorting_prompt_config_validates_and_persists() {
    let app = app().await;
    let default = ok(
        &app,
        "GET",
        "/api/shopping-list/config/default-prompt",
        json!({}),
    )
    .await;
    assert!(!default.to_string().is_empty());
    assert!(
        ok(&app, "GET", "/api/shopping-list/config", json!({})).await["sortingPrompt"].is_null()
    );

    ok(
        &app,
        "PUT",
        "/api/shopping-list/config",
        json!({"sortingPrompt":"Sort by aisle"}),
    )
    .await;
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/config", json!({})).await["sortingPrompt"],
        "Sort by aisle"
    );
    for body in [
        json!({}),
        json!({"sortingPrompt":"  "}),
        json!({"sortingPrompt":5}),
    ] {
        assert_eq!(
            request(&app, "PUT", "/api/shopping-list/config", body)
                .await
                .0,
            400
        );
    }
    ok(
        &app,
        "PUT",
        "/api/shopping-list/config",
        json!({"sortingPrompt":null}),
    )
    .await;
    assert!(
        ok(&app, "GET", "/api/shopping-list/config", json!({})).await["sortingPrompt"].is_null()
    );
}

#[tokio::test]
async fn todo_reorder_and_delete() {
    let app = app().await;
    for name in ["", "   "] {
        assert_eq!(
            request(&app, "POST", "/api/todo-list/items", json!({"name":name}))
                .await
                .0,
            400
        );
        assert_eq!(
            request(&app, "POST", "/api/meal-plan/meals", json!({"name":name}))
                .await
                .0,
            400
        );
    }
    let a = ok(&app, "POST", "/api/todo-list/items", json!({"name":"A"})).await;
    let b = ok(&app, "POST", "/api/todo-list/items", json!({"name":"B"})).await;
    ok(
        &app,
        "PUT",
        "/api/todo-list/reorder",
        json!({"itemIds":[b["id"],a["id"]]}),
    )
    .await;
    let list = ok(&app, "GET", "/api/todo-list", json!({})).await;
    assert_eq!(list["items"][0]["id"], b["id"]);
    assert_eq!(
        request(
            &app,
            "PUT",
            "/api/todo-list/reorder",
            json!({"itemIds":["missing"]})
        )
        .await
        .0,
        404
    );
    let path = format!("/api/todo-list/items/{}", a["id"].as_str().unwrap());
    ok(&app, "DELETE", &path, json!({})).await;
    assert_eq!(request(&app, "DELETE", &path, json!({})).await.0, 404);
    assert_eq!(
        ok(&app, "GET", "/api/todo-list", json!({})).await["items"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
}

#[tokio::test]
async fn meal_plan_start_date_reset_and_history_removal() {
    let app = app().await;
    assert_eq!(
        request(
            &app,
            "PUT",
            "/api/meal-plan/start-date",
            json!({"startDate":""})
        )
        .await
        .0,
        400
    );
    assert_eq!(
        request(
            &app,
            "PUT",
            "/api/meal-plan/start-date",
            json!({"startDate":"not-a-date"})
        )
        .await
        .0,
        400
    );
    let plan = ok(
        &app,
        "PUT",
        "/api/meal-plan/start-date",
        json!({"startDate":"2026-11-02"}),
    )
    .await;
    assert_eq!(plan["startDate"], "2026-11-02");
    assert_eq!(plan["currentDay"], "2026-11-02");

    ok(&app, "POST", "/api/meal-plan/meals", json!({"name":"Soup"})).await;
    assert_eq!(
        request(&app, "DELETE", "/api/meal-plan", json!({})).await.0,
        204
    );
    let plan = ok(&app, "GET", "/api/meal-plan", json!({})).await;
    assert_eq!(plan["days"], json!([]));
    assert!(plan["startDate"].is_null());

    let history = ok(&app, "GET", "/api/meal-plan/history", json!({})).await;
    assert_eq!(history.as_array().unwrap().len(), 1);
    assert_eq!(history[0]["days"][0]["meals"][0]["name"], "Soup");
    let path = format!(
        "/api/meal-plan/history/{}",
        history[0]["id"].as_str().unwrap()
    );
    ok(&app, "DELETE", &path, json!({})).await;
    assert_eq!(request(&app, "DELETE", &path, json!({})).await.0, 404);

    // Resetting an empty plan archives nothing.
    ok(&app, "DELETE", "/api/meal-plan", json!({})).await;
    assert_eq!(
        ok(&app, "GET", "/api/meal-plan/history", json!({})).await,
        json!([])
    );
}

#[tokio::test]
async fn trmnl_status_starts_unpushed() {
    let status = ok(&app().await, "GET", "/api/trmnl/status", json!({})).await;
    assert_eq!(status["hasPushed"], false);
    assert!(status["lastPushAt"].is_null());
    assert!(status["lastPushError"].is_null());
}
