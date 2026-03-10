# MealPlan

A meal planning app with a React frontend and Hono backend, backed by SQLite.

## Requirements

- Node.js
- npm

## Installation

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Set up the database
npm run db:migrate
npm run db:seed
```

## Running

```bash
npm run dev        # Build frontend + run server on :3001
npm run dev:watch  # Auto-rebuild on file changes
npm run start      # Production mode
```

Open [http://localhost:3001](http://localhost:3001)

## Environment

**`server/.env`**
```env
DATABASE_URL="file:./dev.db"
PORT=3001
```

Optional TRMNL e-ink display integration:
```env
TRMNL_WEBHOOK_URL=https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID
```

## Database

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Create singleton MealPlan record
npm run db:studio    # Open Prisma Studio
```

## Troubleshooting

- **"Meal plan not found"** - Run `npm run db:seed`
- **404 errors** - Frontend not built, run `npm run build`
- **Port in use** - Check `lsof -i :3001`
- **Changes not showing** - Use `npm run dev:watch` or rebuild manually with `npm run build`

## License

MIT
