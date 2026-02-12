#!/usr/bin/env bash
set -e

echo "Starting MealPlan addon..."

# Read user configuration
CONFIG_PATH="/data/options.json"
PORT=$(jq --raw-output '.port // 3001' $CONFIG_PATH)
TRMNL_WEBHOOK_URL=$(jq --raw-output '.trmnl_webhook_url // ""' $CONFIG_PATH)
GOOGLE_API_KEY=$(jq --raw-output '.google_api_key // ""' $CONFIG_PATH)
LANGUAGE=$(jq --raw-output '.language // "en"' $CONFIG_PATH)

# Set environment variables
export DATABASE_URL="file:/data/mealplan.db"
export PORT=$PORT
export NODE_ENV="production"
export TRMNL_WEBHOOK_URL=$TRMNL_WEBHOOK_URL
export GOOGLE_API_KEY=$GOOGLE_API_KEY
export LANGUAGE=$LANGUAGE

echo "Database: $DATABASE_URL"
echo "Port: $PORT"
echo "Language: $LANGUAGE"
if [ -n "$TRMNL_WEBHOOK_URL" ]; then
  echo "TRMNL: Enabled"
else
  echo "TRMNL: Disabled"
fi
if [ -n "$GOOGLE_API_KEY" ]; then
  echo "Shopping list AI sorting: Enabled"
else
  echo "Shopping list AI sorting: Disabled"
fi

# Run database migrations
echo "Running migrations..."
cd /app/server

# Verify Prisma engines are present
echo "Verifying Prisma engines..."
if ! ls node_modules/@prisma/engines/schema-engine-* 2>/dev/null; then
  echo "WARNING: Prisma schema engine binary not found!"
  echo "Listing engine directory:"
  ls -la node_modules/@prisma/engines/ || echo "Engines directory not found"
else
  echo "Prisma engine binaries verified successfully"
fi

npx prisma migrate deploy

# Seed singleton if needed
echo "Checking singleton record..."
node --import tsx src/utils/seed.ts || true

# Start server
echo "Starting server..."
exec node --import tsx src/index.ts
