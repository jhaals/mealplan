#!/usr/bin/env bash
set -e

echo "Starting MealPlan addon..."

# Read user configuration
CONFIG_PATH="/data/options.json"
PORT=$(jq --raw-output '.port // 3001' $CONFIG_PATH)
TRMNL_WEBHOOK_URL=$(jq --raw-output '.trmnl_webhook_url // ""' $CONFIG_PATH)

# Set environment variables
export DATABASE_URL="file:/data/mealplan.db"
export PORT=$PORT
export NODE_ENV="production"
export TRMNL_WEBHOOK_URL=$TRMNL_WEBHOOK_URL

echo "Database: $DATABASE_URL"
echo "Port: $PORT"
if [ -n "$TRMNL_WEBHOOK_URL" ]; then
  echo "TRMNL: Enabled"
else
  echo "TRMNL: Disabled"
fi

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
