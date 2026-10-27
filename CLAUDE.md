# Project guidance

MealPlan is a single-user meal planner with a React frontend and Rust/Axum backend.
The server serves the frontend from `dist/` and the API from `/api/*` on port 3001.
Vite's development server proxies API requests to that port.

## Backend

- `server/src/main.rs`: environment loading, startup, HTTP, shutdown.
- `server/src/lib.rs`: shared application state, typed JSON extraction, route composition, errors, SSE.
- `server/src/models.rs`: typed API responses and archived snapshot records.
- `server/src/db.rs`: SQLx pool setup and embedded schema migrations.
- `server/src/meals.rs`: meals, day shifting, moves, swaps, plan archives.
- `server/src/lists.rs`: shopping lists, todos, recurrence, descriptions, history.
- `server/src/integrations.rs`: OpenRouter sorting and TRMNL pushes.
- `server/tests/compatibility.rs`: API regression tests; `server/tests/database.rs`: database initialization and restart tests.

`meal_plan`, `shopping_list`, and `todo_list` use ID `singleton`. Startup creates
missing singletons and applies pending migrations. Global settings live in `app_settings`
and persist through list archives and plan resets. Multi-step API mutations use
SQLx transactions; a pool with one connection serializes database operations. SSE broadcasts list changes.

## Database and upgrades

The runtime uses SQLx and embedded migrations in `server/migrations`.
Keep applied SQLx migrations immutable. Use typed `FromRow` records and parameterized
queries; do not reintroduce manual row mapping or a connection mutex.
Database names are snake_case. Timestamps are UTC RFC3339 text with milliseconds;
calendar dates stay YYYY-MM-DD. Preserve opaque IDs and archived JSON snapshots.

The add-on uses `/data/mealplan-v2.db`. The one-off legacy importer has been
removed after the successful cutover. Do not rename the active file or reimport
`/data/mealplan.db`; that old snapshot excludes new writes. The web server rejects
unmanaged databases. No historical Prisma migrations are shipped.

## Frontend behavior

`src/hooks/useMealPlanner.ts` and `src/utils/api.ts` treat the server as the source
of truth: mutations call the API and refresh state. Preserve the API contract, camelCase JSON fields, validation, and null-versus-omitted update semantics.
Adding a meal without an explicit day advances `currentDay` by one day. Deleting
or moving the last meal off a day removes that day and shifts subsequent dates
back one day. Dragging onto another meal swaps their days.
Use ISO calendar dates (`YYYY-MM-DD`), and preserve touch-friendly controls.

## Commands

```sh
npm run dev             # Build frontend and run Rust backend
npm run dev:watch       # Watch frontend and run Rust backend
npm run dev:backend     # Cargo debug server; restart after Rust changes
npm run build           # Frontend build
npm run build:backend   # Cargo release build
npm start               # Release server
npm run db:migrate      # Apply migrations and seed singletons, then exit
npm run db:seed          # Alias for migration/initialization
npm run test:backend    # Rust tests
npm run test:e2e        # Playwright on dedicated port 3002, isolated test database
npm run lint
cd server && cargo fmt --check
cd server && cargo clippy --locked --all-targets -- -D warnings
```

Backend commands run from `server/`. Database defaults to `file:./dev.db` and
can be overridden with `DATABASE_URL`. Local environment is loaded from
`server/.env`. Browser tests disable external integrations and use English.
The add-on stores data in `/data/mealplan-v2.db`; `addon/run.sh` exports its settings
and starts the binary. `addon/Dockerfile` builds the frontend and Rust separately.
TRMNL pushes on startup and hourly when stable upcoming content changes; manual
push bypasses hashing. Payload formatting uses Swedish weekday/month names.
