# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MealPlan is a mobile-first meal planning application with a React frontend and Hono backend. It uses a **singleton architecture** - there's only one MealPlan record in the database (id: "singleton"), making this a single-user application.

## Key Architecture Concepts

### Singleton Pattern
The database has exactly ONE MealPlan record with id "singleton". All operations assume this singleton exists:
- **On fresh setup**: Run `bun run db:seed` to create the singleton record
- **All queries**: Use `{ id: 'singleton' }` when querying MealPlan
- **Service layer**: All functions in `server/src/services/mealPlanService.ts` operate on the singleton

### State Management Pattern
The frontend uses a **server-as-source-of-truth** pattern:
- `useMealPlanner.ts` hook manages all state via `useReducer`
- Every mutation (add, delete, move, swap) calls the API then refreshes the entire state with `refreshState()`
- No optimistic updates - always fetch fresh data after mutations
- The reducer only handles `LOAD_STATE` action - all logic is server-side

### Day Auto-Increment Behavior
When adding a meal WITHOUT specifying a day:
1. Meal is added to `currentDay`
2. `currentDay` automatically increments to next day (see `mealPlanService.ts:118-124`)
3. This enables the "quick add" workflow: user keeps typing meal names, app auto-advances days

### Day Shifting on Deletion
When a day becomes empty after deleting its last meal:
1. The empty day is deleted from database
2. All subsequent days shift back by one day (see `shiftDaysAfterDeletion()`)
3. This keeps days contiguous without gaps

### Single-Server Architecture
The app runs on ONE server (port 3001) that serves both static files and API:
- `server/src/index.ts` uses Hono's `serveStatic` to serve built frontend from `dist/`
- API routes are at `/api/*`
- No CORS needed since frontend and backend share same origin
- Frontend MUST be built before running server in production mode

## Essential Commands

### Development Workflow
```bash
# Standard development (manual rebuild on frontend changes)
bun run dev              # Builds frontend once, then runs server on :3001

# Auto-rebuild development (recommended for active development)
bun run dev:watch        # Watches frontend, auto-rebuilds + runs server

# Run frontend and backend separately (advanced)
bun run dev:frontend     # Vite dev server on :5173 (proxies /api to :3001)
bun run dev:backend      # Backend only on :3001
```

### Database Operations
```bash
bun run db:migrate       # Run migrations (creates/updates schema)
bun run db:seed          # Create singleton MealPlan record (REQUIRED on fresh setup)
bun run db:studio        # Open Prisma Studio to view/edit database
cd server && bunx prisma generate  # Regenerate Prisma Client after schema changes
```

### Build and Deploy
```bash
bun run build            # Build frontend for production (output: dist/)
bun run start            # Production mode - serves built files from dist/
bun run lint             # Run ESLint
```

## Critical Files

### Frontend State Management
- `src/hooks/useMealPlanner.ts` - Core hook with all state + API calls
- `src/utils/api.ts` - API client functions
- `src/types/index.ts` - Shared TypeScript interfaces

### Backend Business Logic
- `server/src/services/mealPlanService.ts` - All business logic (add, delete, move, swap, shift days)
- `server/src/routes/mealPlan.ts` - API route handlers
- `server/src/index.ts` - Hono app entry + static file serving

### Database
- `server/prisma/schema.prisma` - 3 models: MealPlan (singleton), DayPlan, Meal
- `server/src/db.ts` - Prisma Client singleton
- `server/src/utils/seed.ts` - Creates the singleton MealPlan record

## Common Gotchas

### "Meal plan not found" Error
The singleton MealPlan record doesn't exist. Run: `bun run db:seed`

### Frontend Changes Not Showing
- If using `bun run dev`: Manually rebuild with `bun run build`
- Switch to `bun run dev:watch` for auto-rebuild

### Server Won't Start / 404 Errors
Frontend not built. Run: `bun run build` before `bun run dev` or `bun run start`

### Port 3001 Already in Use
Check for running processes: `lsof -i :3001`

### After Schema Changes
1. Run `cd server && bunx prisma generate` to update Prisma Client
2. Run `bun run db:migrate` to create migration
3. Restart the server

## Date Handling

All dates are stored as ISO strings (YYYY-MM-DD format):
- Database stores dates as strings, not DateTime
- Frontend uses `date-fns` for date manipulation (parseISO, format, addDays)
- Backend uses `date-fns` for day shifting logic
- API accepts/returns dates as ISO strings

## Drag-and-Drop Implementation

Uses `@dnd-kit` library with two operations:
- **Move**: Drag meal onto empty day (changes day, may trigger day shift)
- **Swap**: Drag meal onto another meal (swaps their days)

Sensors configured for both mouse and touch:
- Mouse: 10px drag distance to activate
- Touch: 250ms hold + 5px tolerance (mobile-friendly)

## Testing the App

After starting the server (`bun run dev`), navigate to http://localhost:3001:
1. Pick a start date
2. Add meals (each meal auto-advances to next day)
3. Drag meals between days to reorganize
4. Delete meals (days auto-shift if empty)
5. Click "Start New Week" to reset

## Mobile-First Considerations

- Minimum 44x44px tap targets for all interactive elements
- Touch sensors with activation delay to prevent accidental drags
- Viewport meta tag prevents zoom on input focus
- Tailwind responsive utilities (mobile-first, then sm:/md:/lg:)

## TRMNL Integration

Push your weekly meal plan to a TRMNL e-ink display device for at-a-glance viewing in your kitchen or office.

### Setup
1. Create a custom TRMNL plugin at https://usetrmnl.com
2. Copy your plugin's webhook URL from the TRMNL plugin settings
3. Add to `server/.env`:
   ```bash
   TRMNL_WEBHOOK_URL=https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID
   ```
4. Restart server: `bun run dev`

### Behavior
- **Automatic Push**: Every hour (only if meal plan data has changed)
- **Manual Push**: Click "Push to TRMNL" button in the app header
- **Change Detection**: Uses SHA-256 hash to detect changes - only pushes when data is modified
- **Rate Limits**: TRMNL allows 12 pushes/hour (30/hour for TRMNL+ subscribers)
- **Initial Sync**: Server pushes current meal plan on startup if TRMNL is configured

### Architecture
- **Backend Service**: `server/src/services/trmnlService.ts` - Core push logic with change detection
- **API Routes**: `server/src/routes/trmnl.ts` - Manual push, status, and config endpoints
- **Database Fields**: `lastPushHash`, `lastPushAt`, `lastPushError` in MealPlan model
- **Periodic Sync**: Implemented in `server/src/index.ts` using `setInterval` (1-hour interval)
- **Frontend**: TRMNL button in `App.tsx` AppHeader component

### Payload Format
The webhook sends formatted meal plan data including:
- Start date and last updated timestamp
- Total days and meals count
- Array of days with formatted dates and meals
- Plain text display format for e-ink rendering

### Troubleshooting
- **Button not showing**: Check that `TRMNL_WEBHOOK_URL` is set in `server/.env`
- **Push failures**: Check server logs for error messages (stored in database as `lastPushError`)
- **No updates on device**: Verify webhook URL is correct and TRMNL plugin is active
- **Too many requests**: TRMNL has rate limits - automatic sync respects change detection to minimize pushes
