# MealPrepp - Simple Meal Planning App

A mobile-first meal planning application with a React frontend and Hono backend, backed by SQLite database. Plan your meals by day with an intuitive drag-and-drop interface.

## Features

- 🗓️ **Dynamic Day Planning** - Start blank and days are automatically created as you add meals
- 📱 **Mobile-First Design** - Optimized for mobile devices with touch-friendly interface
- ↕️ **Auto-Increment** - Each meal automatically moves to the next day
- 🎯 **Drag & Drop** - Easily move meals between days with touch or mouse
- 💾 **Database Persistence** - All changes saved to SQLite database
- ✨ **Clean UI** - Fresh green theme with intuitive design
- 🔄 **Real-time Sync** - Frontend syncs with backend API automatically

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Hono (Bun-native web framework)
- **Database**: SQLite with Prisma ORM
- **API**: RESTful API
- **Deployment**: Single server serves both static files and API (no CORS needed)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+ installed on your system

### Installation

1. **Install dependencies for both frontend and backend:**

```bash
# Install frontend dependencies
bun install

# Install backend dependencies
cd server
bun install
cd ..
```

2. **Set up the database:**

```bash
# Run Prisma migration to create database
bun run db:migrate

# Seed the database with initial data (singleton MealPlan)
bun run db:seed
```

3. **Run the development server:**

```bash
# Build frontend and run server (recommended)
bun run dev

# Or for development with auto-rebuild on file changes
bun run dev:watch

# Production mode
bun run start
```

4. **Open the app:**

Navigate to [http://localhost:3001](http://localhost:3001)

## How to Use

1. **Pick a Start Date** - Choose when you want to start planning meals
2. **Add Your First Meal** - Enter meal name
3. **Auto-Increment** - The app automatically moves to the next day for your next meal
4. **Drag to Reorganize** - Long-press (mobile) or click-and-drag (desktop) to move or swap meals between days
5. **Delete Meals** - Tap the trash icon to remove meals (days automatically shift)
6. **Start Fresh** - Click "Start New Week" to reset and plan a new week

## User Workflow

```
Open app → Pick start date (e.g., Monday)
           ↓
Add "Chicken Salad" → Creates Monday with meal
           ↓
Add "Pasta" → Creates Tuesday with meal
           ↓
Add "Tacos" → Creates Wednesday with meal
           ↓
Drag meals between days to reorganize
           ↓
Changes auto-save to database via API
```

## Tech Stack

### Frontend
- **Runtime:** Bun
- **Build Tool:** Vite 6
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v3
- **Drag & Drop:** @dnd-kit
- **Date Handling:** date-fns
- **State:** React Hooks (useReducer + API integration)

### Backend
- **Framework:** Hono 4
- **Database:** SQLite
- **ORM:** Prisma 5
- **Runtime:** Bun

## Project Structure

```
.
├── src/                          # Frontend source
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   ├── AddMealForm.tsx
│   │   ├── DayItem.tsx
│   │   ├── DatePicker.tsx
│   │   ├── MealCard.tsx
│   │   └── MealList.tsx
│   ├── hooks/
│   │   └── useMealPlanner.ts     # Core state management + API calls
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── utils/
│   │   ├── api.ts                # API client
│   │   └── dateHelpers.ts        # Date manipulation
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # Entry point
│
├── server/                       # Backend source
│   ├── src/
│   │   ├── routes/
│   │   │   └── mealPlan.ts       # API routes
│   │   ├── services/
│   │   │   └── mealPlanService.ts # Business logic
│   │   ├── middleware/
│   │   │   ├── cors.ts           # CORS configuration
│   │   │   └── errorHandler.ts   # Error handling
│   │   ├── utils/
│   │   │   └── seed.ts           # Database seeding
│   │   ├── db.ts                 # Prisma client singleton
│   │   └── index.ts              # Hono app entry
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Migration history
│   └── package.json
│
└── vite.config.ts                # Vite config with API proxy
```

## API Documentation

Base URL: `http://localhost:3001/api`

### Endpoints

#### Get Meal Plan
```http
GET /api/meal-plan
```
Returns the complete meal plan with all days and meals.

**Response:**
```json
{
  "startDate": "2026-02-05",
  "currentDay": "2026-02-08",
  "days": [
    {
      "date": "2026-02-05",
      "meals": [
        {
          "id": "cml9wi7td0003b758ybfm1qy0",
          "name": "Chicken Salad",
          "createdAt": "2026-02-05T20:20:32.401Z"
        }
      ]
    }
  ]
}
```

#### Set Start Date
```http
PUT /api/meal-plan/start-date
Content-Type: application/json

{
  "startDate": "2026-02-05"
}
```

#### Add Meal
```http
POST /api/meal-plan/meals
Content-Type: application/json

{
  "name": "Pasta Carbonara",
  "day": "2026-02-05"  // Optional, defaults to currentDay
}
```

#### Delete Meal
```http
DELETE /api/meal-plan/meals/{mealId}?day=2026-02-05
```
Deletes the meal and automatically shifts subsequent days if the day becomes empty.

#### Move Meal
```http
PUT /api/meal-plan/meals/{mealId}/move
Content-Type: application/json

{
  "sourceDay": "2026-02-05",
  "targetDay": "2026-02-07"
}
```

#### Swap Meals
```http
PUT /api/meal-plan/meals/swap
Content-Type: application/json

{
  "meal1Id": "cml9wi7td0003b758ybfm1qy0",
  "meal1Day": "2026-02-05",
  "meal2Id": "cml9wi7td0004b758ybfm1qy1",
  "meal2Day": "2026-02-06"
}
```

#### Reset Meal Plan
```http
DELETE /api/meal-plan
```
Clears all meals and resets the meal plan.

#### Health Check
```http
GET /health
```
Returns server health status.

## Database Commands

```bash
# Create a new migration after schema changes
bun run db:migrate

# Open Prisma Studio to view/edit database
bun run db:studio

# Seed the database (create singleton MealPlan)
bun run db:seed

# Generate Prisma Client (after schema changes)
cd server && bunx prisma generate
```

## Database Schema

The app uses a simple SQLite schema with three tables:

- **MealPlan** - Singleton record storing start date and current day
- **DayPlan** - Individual days with meals
- **Meal** - Individual meal records

See `server/prisma/schema.prisma` for full schema definition.

## Development Scripts

```bash
# Development
bun run dev              # Build frontend + run server (single port 3001)
bun run dev:watch        # Auto-rebuild frontend on changes + run server
bun run start            # Production mode (serve built files)

# Build
bun run build            # Build frontend for production

# Database
bun run db:migrate       # Run Prisma migrations
bun run db:studio        # Open Prisma Studio
bun run db:seed          # Seed database

# Linting
bun run lint             # Run ESLint
```

**Note**: The app runs on a single server (port 3001) that serves both the static frontend files and the API endpoints. This eliminates CORS issues and simplifies deployment.

## Environment Variables

### Backend (`server/.env`)
```env
DATABASE_URL="file:./dev.db"
PORT=3001
```

### Frontend (`.env`)
```env
# API URL - leave empty for relative paths (same-origin)
VITE_API_URL=
```

## Mobile Optimization

- Minimum 44x44px tap targets for touch
- Touch-optimized drag and drop with activation delay
- Prevents zoom on input focus
- Safe area insets for notched devices
- Responsive layout (mobile-first, desktop-enhanced)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 14+
- Android Chrome 90+

## Troubleshooting

### Server won't start
- Ensure bun is installed: `bun --version`
- Check if port 3001 is available: `lsof -i :3001`
- Verify database exists: `ls server/prisma/dev.db`
- Re-run migrations: `bun run db:migrate`
- Make sure frontend is built: `bun run build`

### Page won't load / 404 errors
- Verify frontend is built: `ls dist/index.html`
- Rebuild the frontend: `bun run build`
- Check server is serving static files correctly

### API errors / "Meal plan not found"
- Run `bun run db:seed` to create the singleton MealPlan record
- Check database exists: `ls server/prisma/dev.db`

### Database errors
- Delete `server/prisma/dev.db` and re-run `bun run db:migrate`
- Run `bun run db:seed` to recreate singleton MealPlan
- Check Prisma logs for migration issues

### Development changes not showing
- Using `bun run dev`? Rebuild manually after changes: `bun run build`
- Use `bun run dev:watch` for auto-rebuild on file changes

## Production Deployment

For production deployment:

1. Use PostgreSQL instead of SQLite
2. Set up proper environment variables
3. Add authentication/authorization
4. Enable HTTPS
5. Set up proper CORS origins
6. Add rate limiting
7. Enable logging and monitoring

See the plan document for production considerations.

## License

MIT
