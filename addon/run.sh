#!/usr/bin/env bash
set -e

echo "Starting MealPlan addon..."

# Read user configuration
CONFIG_PATH="/data/options.json"
PORT=$(jq --raw-output '.port // 3001' $CONFIG_PATH)

# Set environment variables
export DATABASE_URL="file:/data/mealplan.db"
export PORT=$PORT
export NODE_ENV="production"

echo "Database: $DATABASE_URL"
echo "Port: $PORT"

# Run database migrations
echo "Running migrations..."
cd /app/server
bunx prisma migrate deploy

# Seed singleton if needed
echo "Checking singleton record..."
bun run dist/utils/seed.js || true

# Start server
echo "Starting server..."
exec bun run dist/index.js
