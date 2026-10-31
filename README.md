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
openrouter_base_url: ""   # Optional OpenAI-compatible base URL (e.g. http://host:11434/v1)
language: "en"             # UI language: "en" or "sv" (optional)
```

### TRMNL

Get your webhook URL from your TRMNL plugin settings (`https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID`). When configured, the meal plan is automatically pushed to the device on changes.

### AI shopping list sorting

Configure an OpenRouter API key with `openrouter_api_key`. When configured, enables AI-powered sorting of the shopping list grouped by store section. To use another OpenAI-compatible API (OpenAI, Ollama, LM Studio, ...), set `openrouter_base_url` (the API key is then optional) and `openrouter_model`.

## Data & Backups

The active database is `/data/mealplan-v2.db`, included in Home Assistant backups.
Startup applies pending SQLx schema migrations and initializes missing singleton
records. Existing data is preserved across restarts; fresh installs initialize
automatically. The one-off legacy importer has been removed after the successful
upgrade. The old `/data/mealplan.db` file is no longer used or modified.

SQLx manages future schema changes from `server/migrations`. Database columns use
snake_case and UTC RFC3339 timestamps; API JSON remains camelCase. Sorting settings
and TRMNL sync state live in `app_settings` independently of meal-plan resets.

Keep the entire `/data` directory in backups. The old `/data/mealplan.db`, if
present, is only a snapshot from before the upgrade and excludes subsequent edits.

Locally, commands run from `server/` and default to `file:./dev.db`.
`DATABASE_URL` accepts `file:` paths and SQLx `sqlite:` URLs. Unsupported database
schemas are rejected. Neither Prisma nor Node.js is needed for database access.

`server/.env` can set `DATABASE_URL`, `PORT`, `LANGUAGE`, `TRMNL_WEBHOOK_URL`,
`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL`. `STATIC_DIR` defaults to `../dist`.
`npm run db:migrate` applies SQLx migrations and initializes singletons without
starting HTTP; `npm run db:seed` is an alias.

## Troubleshooting

- **Add-on won't start** - Check logs; if port 3001 is in use, change it in configuration
- **"Meal plan not found"** - Restart the add-on to reinitialize the database
- **Reset database** - Stop add-on, delete `/data/mealplan-v2.db`, restart
