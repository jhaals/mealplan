use mealplan_server::{router, App};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    run()
}

#[tokio::main]
async fn run() -> Result<(), Box<dyn std::error::Error>> {
    let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "file:./dev.db".into());
    let db = rusqlite::Connection::open(&url)?;
    let app = App::new(db).map_err(|e| format!("Database initialization failed: {e:?}"))?;
    if std::env::args().any(|a| a == "--migrate") {
        return Ok(());
    }
    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".into());
    let dist = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../dist".into());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await?;
    mealplan_server::start_sync(app.clone());
    println!("Server running on http://localhost:{port}");
    axum::serve(listener, router(app, &dist))
        .with_graceful_shutdown(async {
            tokio::signal::ctrl_c().await.ok();
        })
        .await?;
    Ok(())
}
