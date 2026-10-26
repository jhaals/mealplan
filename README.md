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

Data is stored in `/data/mealplan.db` and included automatically in Home Assistant backups.
The Rust backend opens the same SQLite file as the old backend. Existing IDs,
meals, lists, recurring tasks, descriptions, archives, and settings are retained;
no export or conversion is required. Stop the old server before starting Rust.

Startup applies pending migrations from `server/prisma/migrations` and creates
missing singleton records. The existing `_prisma_migrations` ledger and migration
checksums are preserved, so an up-to-date database remains readable by Prisma.
Do not edit historical migration SQL files. Take a database backup before upgrading.

Locally, commands run from `server/` and default to `file:./dev.db`, matching the old
server. `server/.env` can set `DATABASE_URL`, `PORT`, `LANGUAGE`,
`TRMNL_WEBHOOK_URL`, `OPENROUTER_API_KEY`, and `OPENROUTER_MODEL`.
Absolute paths such as `DATABASE_URL=file:/data/mealplan.db` are supported.
`STATIC_DIR` defaults to `../dist`. `npm run db:migrate` applies migrations and
initializes missing singletons without starting HTTP; `npm run db:seed` is an alias.
SQLite tools can inspect the database; Prisma is no longer required at runtime.

## Troubleshooting

- **Add-on won't start** - Check logs; if port 3001 is in use, change it in configuration
- **"Meal plan not found"** - Restart the add-on to reinitialize the database
- **Reset database** - Stop add-on, delete `/data/mealplan.db`, restart

## License

MIT
