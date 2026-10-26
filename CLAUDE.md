# Project guidance

MealPlan is a single-user meal planner with a React frontend and Rust/Axum backend.
The server serves the frontend from `dist/` and the API from `/api/*` on port 3001.
Vite's development server proxies API requests to that port.

## Backend

- `server/src/main.rs`: environment loading, startup, HTTP, shutdown.
- `server/src/lib.rs`: shared application state, typed JSON extraction, route composition, errors, SSE.
- `server/src/models.rs`: typed API responses and archived snapshot records.
- `server/src/db.rs`: SQLite access, timestamp compatibility, original Prisma migrations.
- `server/src/meals.rs`: meals, day shifting, moves, swaps, plan archives.
- `server/src/lists.rs`: shopping lists, todos, recurrence, descriptions, history.
- `server/src/integrations.rs`: OpenRouter sorting and TRMNL pushes.
- `server/tests/compatibility.rs`: legacy database and API regression tests.

`MealPlan`, `ShoppingList`, and `TodoList` use ID `singleton`. Startup creates
missing singletons and applies pending migrations. Global settings live on MealPlan
and persist through list archives and plan resets. Multi-step API mutations use
transactions; database work runs on blocking threads. SSE broadcasts list changes.

## Database compatibility

Keep the original SQLite table/column names, foreign keys, and archived JSON formats.
Preserve `server/prisma/migrations` and the `_prisma_migrations` ledger. Never edit
historical SQL: startup verifies its SHA-256 checksum against Prisma's ledger.
New migrations must be added to the ordered `MIGRATIONS` list in `db.rs`.
`server/prisma/schema.prisma` documents the legacy schema.
Old databases can contain integer milliseconds, ISO timestamps, or SQLite datetime
strings. Normalize them for API responses without rewriting existing rows.
The runtime does not need Node, Prisma, or generated TypeScript.

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
The add-on stores data in `/data/mealplan.db`; `addon/run.sh` exports its settings
and starts the binary. `addon/Dockerfile` builds the frontend and Rust separately.
TRMNL pushes on startup and hourly when stable upcoming content changes; manual
push bypasses hashing. Payload formatting uses Swedish weekday/month names.
