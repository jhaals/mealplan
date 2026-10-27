# MealPlan

Home Assistant add-on for meal planning with a drag-and-drop interface.

The backend is Rust (Axum + SQLite); the frontend is React and TypeScript.

For local development, install stable Rust and Node.js 26.12.1 (see
`.node-version`), then run:

```sh
npm ci
npm run dev             # Build frontend and start Rust on port 3001
npm run dev:watch       # Rebuild frontend while developing
npm run test:backend    # Database compatibility and API tests
npm run test:e2e        # Browser tests on an isolated server on port 3002
```

`npm start` builds/runs the release backend. For backend development, run
`npm run dev:backend`; restart it after Rust changes. `npm run build:backend`
builds the release binary without starting it.

## Installation

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the three-dot menu → **Repositories**
3. Add `https://github.com/jhaals/mealplan`
4. Install and start the **MealPlan** add-on
5. Open `http://homeassistant.local:3001`

## Configuration

```yaml
port: 3001                 # Web interface port (optional, default: 3001)
trmnl_webhook_url: ""      # TRMNL e-ink display webhook URL (optional)
openrouter_api_key: ""    # OpenRouter key for shopping list sorting (optional)
openrouter_model: ""      # Optional model override
language: "en"             # UI language: "en" or "sv" (optional)
```

### TRMNL

Get your webhook URL from your TRMNL plugin settings (`https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID`). When configured, the meal plan is automatically pushed to the device on changes.

### AI shopping list sorting

Configure an OpenRouter API key with `openrouter_api_key`. When configured, enables AI-powered sorting of the shopping list grouped by store section.

## Data & Backups

The active database is `/data/mealplan-v2.db`, included in Home Assistant backups.
The add-on automatically upgrades the old `/data/mealplan.db` before starting HTTP.
It writes a separate temporary database, copies and verifies every row, normalizes
timestamps, and only then publishes the new file. The original database remains
untouched. No manual command is required.

Subsequent starts use the new database and skip importing. Fresh installs initialize
it directly. If import or validation fails, the add-on stops and logs the error;
it never replaces existing data with an empty database. Incomplete temporary imports
are discarded and retried on restart. An existing invalid destination is never
silently overwritten.

SQLx manages future schema changes from `server/migrations`. Database columns use
snake_case and UTC RFC3339 timestamps; API JSON remains camelCase. Sorting settings
and TRMNL sync state live in `app_settings` independently of meal-plan resets.

To roll back the upgrade, stop the add-on and restore the previous add-on version,
which uses the preserved `/data/mealplan.db`. That file contains the data from before
cutover; it does not include edits made in the new version. Keep the entire `/data`
directory in backups and retain the original until satisfied with the upgrade.

Locally, commands run from `server/` and default to `file:./dev.db`.
`DATABASE_URL` accepts existing `file:` paths and SQLx `sqlite:` URLs. A local
legacy database is rejected rather than treated as an empty SQLx database; the
standalone importer is `cargo run --bin migrate-legacy -- OLD.db NEW.db`.
The add-on invokes this importer automatically. Normal startup contains no legacy
queries, and neither Prisma nor Node.js is needed for database access.

`server/.env` can set `DATABASE_URL`, `PORT`, `LANGUAGE`, `TRMNL_WEBHOOK_URL`,
`OPENROUTER_API_KEY`, and `OPENROUTER_MODEL`. `STATIC_DIR` defaults to `../dist`.
`npm run db:migrate` applies SQLx migrations and initializes singletons without
starting HTTP; `npm run db:seed` is an alias.

## Troubleshooting

- **Add-on won't start** - Check logs; if port 3001 is in use, change it in configuration
- **"Meal plan not found"** - Restart the add-on to reinitialize the database
- **Reset database** - Stop add-on, delete `/data/mealplan-v2.db` and the retained `/data/mealplan.db`, restart