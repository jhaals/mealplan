use axum::{
    body::{to_bytes, Body},
    http::Request,
};
use mealplan_server::{
    db::{self, MIGRATIONS},
    router, App,
};
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn static_frontend_and_page_routes_return_success() {
    let directory = std::env::temp_dir().join(format!("mealplan-static-{}", db::id()));
    std::fs::create_dir_all(directory.join("assets")).unwrap();
    let html = "<!doctype html><div id=\"root\"></div>";
    std::fs::write(directory.join("index.html"), html).unwrap();
    std::fs::write(directory.join("assets/app.js"), "console.log('static')").unwrap();
    let app = App::new(Connection::open_in_memory().unwrap()).unwrap();
    let service = router(app, directory.to_str().unwrap());
    for path in ["/", "/meals", "/shopping", "/todos"] {
        let response = service
            .clone()
            .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), 200, "{path}");
        assert_eq!(response.headers()["content-type"], "text/html");
        assert_eq!(to_bytes(response.into_body(), 1024).await.unwrap(), html);
    }
    let response = service
        .oneshot(
            Request::builder()
                .uri("/assets/app.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(
        to_bytes(response.into_body(), 1024).await.unwrap(),
        "console.log('static')"
    );
    std::fs::remove_dir_all(directory).unwrap();
}

// Build a legacy database independently of the Rust initializer, including Prisma's ledger.
fn legacy_database(migrations: usize) -> Connection {
    let db = Connection::open_in_memory().unwrap();
    db.execute_batch("CREATE TABLE _prisma_migrations (id TEXT PRIMARY KEY, checksum TEXT NOT NULL, finished_at DATETIME, migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME, started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, applied_steps_count INTEGER NOT NULL DEFAULT 0);").unwrap();
    for (name, sql) in MIGRATIONS.iter().take(migrations) {
        db.execute_batch(sql).unwrap();
        db.execute("INSERT INTO _prisma_migrations (id,checksum,migration_name,finished_at,applied_steps_count) VALUES (?1,?2,?1,CURRENT_TIMESTAMP,1)",params![name,db::sha256(sql.as_bytes())]).unwrap();
    }
    db.execute("INSERT INTO MealPlan (id,startDate,currentDay,createdAt,updatedAt) VALUES ('singleton','2026-10-26','2026-10-27',1700000000000,1700000000000)",[]).unwrap();
    db.execute("INSERT INTO DayPlan (id,mealPlanId,date,createdAt,updatedAt) VALUES ('old-day','singleton','2026-10-26','2026-10-26 12:00:00','2026-10-26 12:00:00')",[]).unwrap();
    db.execute("INSERT INTO Meal (id,dayPlanId,name,createdAt,updatedAt) VALUES ('old-meal','old-day','Köttbullar',1700000000000,1700000000000)",[]).unwrap();
    db
}
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
    (
        status,
        if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap()
        },
    )
}
async fn ok(app: &App, method: &str, path: &str, body: Value) -> Value {
    let (status, data) = request(app, method, path, body).await;
    assert!(
        (200..300).contains(&status),
        "{method} {path}: {status} {data}"
    );
    data
}
#[tokio::test]
async fn legacy_database_retains_data_and_accepts_rust_writes() {
    let db = legacy_database(MIGRATIONS.len());
    db.execute("UPDATE MealPlan SET sortingPrompt='Custom prompt',lastPushAt=1700000000000,lastPushHash='old-hash'",[]).unwrap();
    db.execute("INSERT INTO ShoppingList (id,createdAt,updatedAt) VALUES ('singleton',1700000000000,1700000000000)",[]).unwrap();
    db.execute("INSERT INTO ShoppingListItem (id,shoppingListId,name,createdAt,updatedAt) VALUES ('old-item','singleton','Mjölk',1700000000000,1700000000000)",[]).unwrap();
    db.execute("INSERT INTO TodoList (id,createdAt,updatedAt) VALUES ('singleton',1700000000000,1700000000000)",[]).unwrap();
    db.execute("INSERT INTO TodoItem (id,todoListId,name,description,isRecurring,recurrenceInterval,createdAt,updatedAt) VALUES ('old-todo','singleton','Clean','Keep this note',1,'weekly',1700000000000,1700000000000)",[]).unwrap();
    db.execute("INSERT INTO ArchivedMealPlan (id,startDate,endDate,data,createdAt) VALUES ('old-history','2026-01-01','2026-01-01',?1,1700000000000)",[json!([{"date":"2026-01-01","meals":[]}]).to_string()]).unwrap();
    let app = App::new(db).unwrap();
    let plan = ok(&app, "GET", "/api/meal-plan", json!({})).await;
    assert_eq!(
        plan["days"][0]["meals"][0],
        json!({"id":"old-meal","name":"Köttbullar","createdAt":"2023-11-14T22:13:20.000Z"})
    );
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list", json!({})).await["items"][0]["id"],
        "old-item"
    );
    assert_eq!(
        ok(&app, "GET", "/api/todo-list", json!({})).await["items"][0]["description"],
        "Keep this note"
    );
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/config", json!({})).await["sortingPrompt"],
        "Custom prompt"
    );
    assert_eq!(
        ok(&app, "GET", "/api/trmnl/status", json!({})).await["lastPushAt"],
        "2023-11-14T22:13:20.000Z"
    );
    assert_eq!(
        ok(&app, "GET", "/api/meal-plan/history", json!({})).await[0]["id"],
        "old-history"
    );
    ok(
        &app,
        "PUT",
        "/api/shopping-list/items/old-item/toggle",
        json!({}),
    )
    .await;
    ok(
        &app,
        "PUT",
        "/api/todo-list/items/old-todo",
        json!({"description":" Updated note "}),
    )
    .await;
    ok(
        &app,
        "POST",
        "/api/meal-plan/meals",
        json!({"name":"New meal"}),
    )
    .await;
    let mut db = app.db.lock().unwrap();
    db::initialize(&mut db).unwrap();
    assert_eq!(
        db.query_row("SELECT COUNT(*) FROM _prisma_migrations", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        MIGRATIONS.len() as i64
    );
    assert_eq!(
        db.query_row(
            "SELECT description FROM TodoItem WHERE id='old-todo'",
            [],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "Updated note"
    );
    assert_eq!(
        db.query_row("SELECT COUNT(*) FROM Meal", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        2
    );
    assert_eq!(
        db.query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap(),
        0
    );
}
#[test]
fn upgrades_older_prisma_databases_without_losing_rows() {
    for count in [1, 3, 4, 5, 6, 7] {
        let mut db = legacy_database(count);
        db::initialize(&mut db).unwrap();
        assert_eq!(
            db.query_row("SELECT name FROM Meal WHERE id='old-meal'", [], |r| r
                .get::<_, String>(0))
                .unwrap(),
            "Köttbullar"
        );
        assert_eq!(
            db.query_row("PRAGMA foreign_keys", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            1
        );
        assert!(db.prepare("SELECT description FROM TodoItem").is_ok());
    }
}
#[tokio::test]
async fn meal_moves_shifts_swaps_and_archives_are_atomic() {
    let app = App::new(Connection::open_in_memory().unwrap()).unwrap();
    assert_eq!(
        request(
            &app,
            "POST",
            "/api/meal-plan/meals",
            json!({"name":"Dinner"})
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
            json!({"startDate":"invalid"})
        )
        .await
        .0,
        400
    );
    ok(
        &app,
        "PUT",
        "/api/meal-plan/start-date",
        json!({"startDate":"2026-10-26"}),
    )
    .await;
    let a = ok(&app, "POST", "/api/meal-plan/meals", json!({"name":"A"})).await;
    let b = ok(&app, "POST", "/api/meal-plan/meals", json!({"name":"B"})).await;
    assert_eq!(
        ok(&app, "GET", "/api/meal-plan", json!({})).await["currentDay"],
        "2026-10-28"
    );
    assert_eq!(request(&app,"PUT","/api/meal-plan/meals/swap",json!({"meal1Id":a["id"],"meal1Day":"2026-10-26","meal2Id":"missing","meal2Day":"2026-10-27"})).await.0,404);
    ok(&app,"PUT","/api/meal-plan/meals/swap",json!({"meal1Id":a["id"],"meal1Day":"2026-10-26","meal2Id":b["id"],"meal2Day":"2026-10-27"})).await;
    ok(
        &app,
        "PUT",
        &format!("/api/meal-plan/meals/{}/move", a["id"].as_str().unwrap()),
        json!({"sourceDay":"2026-10-27","targetDay":"2026-10-26"}),
    )
    .await;
    let plan = ok(&app, "GET", "/api/meal-plan", json!({})).await;
    assert_eq!(plan["days"].as_array().unwrap().len(), 1);
    assert_eq!(plan["days"][0]["meals"].as_array().unwrap().len(), 2);
    ok(&app, "DELETE", "/api/meal-plan", json!({})).await;
    assert_eq!(
        ok(&app, "GET", "/api/meal-plan/history", json!({})).await[0]["days"][0]["meals"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert!(ok(&app, "GET", "/api/meal-plan", json!({})).await["startDate"].is_null());
    let c = ok(
        &app,
        "PUT",
        "/api/meal-plan/start-date",
        json!({"startDate":"2026-10-26"}),
    )
    .await;
    assert_eq!(c["currentDay"], "2026-10-26");
    let a = ok(&app, "POST", "/api/meal-plan/meals", json!({"name":"A"})).await;
    ok(&app, "POST", "/api/meal-plan/meals", json!({"name":"B"})).await;
    ok(
        &app,
        "DELETE",
        &format!(
            "/api/meal-plan/meals/{}?day=2026-10-26",
            a["id"].as_str().unwrap()
        ),
        json!({}),
    )
    .await;
    let p = ok(&app, "GET", "/api/meal-plan", json!({})).await;
    assert_eq!(p["days"][0]["date"], "2026-10-26");
    assert_eq!(p["currentDay"], "2026-10-27");
}
#[tokio::test]
async fn lists_preserve_descriptions_recurrence_history_and_order() {
    let app = App::new(Connection::open_in_memory().unwrap()).unwrap();
    let mut events = app.events.subscribe();
    let a = ok(
        &app,
        "POST",
        "/api/shopping-list/items",
        json!({"name":" Milk "}),
    )
    .await;
    assert_eq!(events.recv().await.unwrap(), "shopping-list-changed");
    let b = ok(
        &app,
        "POST",
        "/api/shopping-list/items",
        json!({"name":"Eggs"}),
    )
    .await;
    assert_eq!(
        request(
            &app,
            "PUT",
            "/api/shopping-list/reorder",
            json!({"itemIds":[b["id"],"missing"]})
        )
        .await
        .0,
        404
    );
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list", json!({})).await["items"][0]["id"],
        a["id"]
    );
    ok(
        &app,
        "PUT",
        "/api/shopping-list/reorder",
        json!({"itemIds":[b["id"],a["id"]]}),
    )
    .await;
    ok(&app, "POST", "/api/shopping-list/archive", json!({})).await;
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/history", json!({})).await[0]["items"][0]["name"],
        "Eggs"
    );
    let todo = ok(&app,"POST","/api/todo-list/items",json!({"name":"Clean","description":"  Note  ","isRecurring":true,"recurrenceInterval":"weekly"})).await;
    let path = format!("/api/todo-list/items/{}", todo["id"].as_str().unwrap());
    assert_eq!(todo["description"], "Note");
    let completed = ok(&app, "PUT", &format!("{path}/toggle"), json!({})).await;
    assert_eq!(completed["checked"], false);
    assert!(completed["lastCompletedAt"].is_string());
    assert_eq!(
        ok(&app, "GET", "/api/todo-list", json!({})).await["items"],
        json!([])
    );
    assert_eq!(
        ok(&app, "GET", "/api/todo-list/recurring", json!({}))
            .await
            .as_array()
            .unwrap()
            .len(),
        1
    );
    let updated = ok(
        &app,
        "PUT",
        &path,
        json!({"description":"  ","isRecurring":false}),
    )
    .await;
    assert!(updated["description"].is_null());
    assert!(updated["nextDueDate"].is_null());
    ok(&app, "PUT", &format!("{path}/toggle"), json!({})).await;
    ok(&app, "POST", "/api/todo-list/clear-completed", json!({})).await;
    assert_eq!(
        request(&app, "PUT", &path, json!({"name":"missing"}))
            .await
            .0,
        404
    );
}
#[test]
fn timestamps_accept_all_legacy_formats() {
    use rusqlite::types::Value as SqlValue;
    let db = Connection::open_in_memory().unwrap();
    for value in [
        SqlValue::Integer(1700000000000),
        SqlValue::Text("2023-11-14T22:13:20.000Z".into()),
        SqlValue::Text("2023-11-14 22:13:20".into()),
    ] {
        assert_eq!(
            db.query_row("SELECT ?1", [value], |row| db::timestamp(row, 0))
                .unwrap(),
            "2023-11-14T22:13:20.000Z"
        );
    }
    assert_eq!(
        db.query_row("SELECT NULL", [], |row| db::optional_timestamp(row, 0))
            .unwrap(),
        None
    );
}

#[test]
fn upgrades_preserve_old_shopping_prompt_and_reject_unresolved_migrations() {
    let mut db = legacy_database(5);
    db.execute("INSERT INTO ShoppingList (id,sortingPrompt,updatedAt) VALUES ('singleton','Old aisle order',CURRENT_TIMESTAMP)",[]).unwrap();
    db::initialize(&mut db).unwrap();
    assert_eq!(
        db.query_row(
            "SELECT sortingPrompt FROM MealPlan WHERE id='singleton'",
            [],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "Old aisle order"
    );
    let mut db = legacy_database(1);
    db.execute(
        "INSERT INTO _prisma_migrations (id,checksum,migration_name) VALUES ('failed','bad',?1)",
        [MIGRATIONS[1].0],
    )
    .unwrap();
    assert!(db::initialize(&mut db).is_err());
    assert_eq!(
        db.query_row("SELECT name FROM Meal WHERE id='old-meal'", [], |r| r
            .get::<_, String>(0))
            .unwrap(),
        "Köttbullar"
    );
}

#[tokio::test]
async fn malformed_routes_and_payloads_return_json_errors() {
    let app = App::new(Connection::open_in_memory().unwrap()).unwrap();
    for path in [
        "/api/shopping-list/items/toggle",
        "/api/todo-list/items/toggle",
        "/api/meal-plan/meals/move",
    ] {
        let (status, body) = request(&app, "PUT", path, json!({})).await;
        assert!(status >= 400);
        assert!(body["error"]["message"].is_string());
    }
    for body in [
        json!({"name":"Task","isRecurring":"yes"}),
        json!({"name":"Task","description":42}),
        json!({"name":"Task","recurrenceDays":-1}),
    ] {
        assert_eq!(
            request(&app, "POST", "/api/todo-list/items", body).await.0,
            400
        );
    }
    let response = router(app, "/nonexistent")
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/shopping-list/items")
                .body(Body::from("{broken"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 400);
}

#[tokio::test]
async fn mixed_legacy_timestamp_formats_sort_chronologically() {
    let db = legacy_database(MIGRATIONS.len());
    db.execute(
        "UPDATE Meal SET createdAt=1704067200000 WHERE id='old-meal'",
        [],
    )
    .unwrap();
    db.execute("INSERT INTO Meal (id,dayPlanId,name,createdAt,updatedAt) VALUES ('text-meal','old-day','Earlier','2023-01-01T00:00:00.000Z','2023-01-01T00:00:00.000Z')",[]).unwrap();
    db.execute("INSERT INTO ArchivedShoppingList (id,data,createdAt) VALUES ('numeric-newer','[]',1704067200000),('text-older','[]','2023-01-01T00:00:00.000Z')",[]).unwrap();
    let app = App::new(db).unwrap();
    assert_eq!(
        ok(&app, "GET", "/api/meal-plan", json!({})).await["days"][0]["meals"][0]["id"],
        "text-meal"
    );
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/history", json!({})).await[0]["id"],
        "numeric-newer"
    );
}

#[test]
fn sha256_keeps_the_legacy_hex_format() {
    assert_eq!(
        db::sha256(b"hello world"),
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    );
}

#[tokio::test]
async fn typed_requests_preserve_partial_updates_and_reject_wrong_types() {
    let app = App::new(Connection::open_in_memory().unwrap()).unwrap();
    let todo = ok(&app,"POST","/api/todo-list/items",json!({"name":"Original","description":"Keep this","isRecurring":true,"recurrenceInterval":"custom","recurrenceDays":3})).await;
    let path = format!("/api/todo-list/items/{}", todo["id"].as_str().unwrap());
    let renamed = ok(&app, "PUT", &path, json!({"name":"Renamed"})).await;
    assert_eq!(renamed["description"], "Keep this");
    assert_eq!(renamed["recurrenceDays"], 3);
    let cleared = ok(
        &app,
        "PUT",
        &path,
        json!({"description":null,"recurrenceDays":null}),
    )
    .await;
    assert!(cleared["description"].is_null());
    assert!(cleared["recurrenceDays"].is_null());
    assert_eq!(cleared["name"], "Renamed");
    for body in [
        json!({"name":null}),
        json!({"isRecurring":null}),
        json!({"description":false}),
        json!({"recurrenceDays":"3"}),
    ] {
        let (status, error) = request(&app, "PUT", &path, body).await;
        assert_eq!(status, 400);
        assert_eq!(error["error"]["statusCode"], 400);
    }
    ok(
        &app,
        "PUT",
        "/api/shopping-list/config",
        json!({"sortingPrompt":"Keep prompt"}),
    )
    .await;
    assert_eq!(
        request(&app, "PUT", "/api/shopping-list/config", json!({}))
            .await
            .0,
        400
    );
    assert_eq!(
        ok(&app, "GET", "/api/shopping-list/config", json!({})).await["sortingPrompt"],
        "Keep prompt"
    );
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
    assert_eq!(
        request(
            &app,
            "POST",
            "/api/meal-plan/meals",
            json!({"name":"Meal","day":false})
        )
        .await
        .0,
        400
    );
    assert_eq!(
        request(
            &app,
            "PUT",
            "/api/shopping-list/reorder",
            json!({"itemIds":[42]})
        )
        .await
        .0,
        400
    );
    let (status, error) = request(&app, "GET", "/api/does-not-exist", json!({})).await;
    assert_eq!(status, 404);
    assert_eq!(error["error"]["statusCode"], 404);
}
