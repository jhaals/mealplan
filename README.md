# MealPlan

A meal planning app with a React frontend and Hono backend, backed by SQLite.

## Requirements

- [Bun](https://bun.sh) v1.0+

## Installation

```bash
# Install dependencies
bun install
cd server && bun install && cd ..

# Set up the database
bun run db:migrate
bun run db:seed
```

## Running

```bash
bun run dev        # Build frontend + run server on :3001
bun run dev:watch  # Auto-rebuild on file changes
bun run start      # Production mode
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
bun run db:migrate   # Run migrations
bun run db:seed      # Create singleton MealPlan record
bun run db:studio    # Open Prisma Studio
```

## Troubleshooting

- **"Meal plan not found"** - Run `bun run db:seed`
- **404 errors** - Frontend not built, run `bun run build`
- **Port in use** - Check `lsof -i :3001`
- **Changes not showing** - Use `bun run dev:watch` or rebuild manually with `bun run build`

## License

MIT
