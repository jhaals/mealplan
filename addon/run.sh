#!/usr/bin/env bash
set -e

echo "Starting MealPlan addon..."

# Read user configuration
CONFIG_PATH="/data/options.json"
PORT=$(jq --raw-output '.port // 3001' $CONFIG_PATH)
TRMNL_WEBHOOK_URL=$(jq --raw-output '.trmnl_webhook_url // ""' $CONFIG_PATH)
OPENROUTER_API_KEY=$(jq --raw-output '.openrouter_api_key // ""' $CONFIG_PATH)
OPENROUTER_MODEL=$(jq --raw-output '.openrouter_model // ""' $CONFIG_PATH)
OPENROUTER_BASE_URL=$(jq --raw-output '.openrouter_base_url // ""' $CONFIG_PATH)
LANGUAGE=$(jq --raw-output '.language // "en"' $CONFIG_PATH)

# Set environment variables
export DATABASE_URL="file:/data/mealplan-v2.db"
export PORT=$PORT
export TRMNL_WEBHOOK_URL=$TRMNL_WEBHOOK_URL
export OPENROUTER_API_KEY=$OPENROUTER_API_KEY
export OPENROUTER_MODEL=$OPENROUTER_MODEL
export OPENROUTER_BASE_URL=$OPENROUTER_BASE_URL
export LANGUAGE=$LANGUAGE

echo "Database: $DATABASE_URL"
echo "Port: $PORT"
echo "Language: $LANGUAGE"
if [ -n "$TRMNL_WEBHOOK_URL" ]; then
  echo "TRMNL: Enabled"
else
  echo "TRMNL: Disabled"
fi
if [ -n "$OPENROUTER_API_KEY" ] || [ -n "$OPENROUTER_BASE_URL" ]; then
  echo "Shopping list AI sorting: Enabled"
else
  echo "Shopping list AI sorting: Disabled"
fi

# Start the server; SQLx applies pending schema migrations.
cd /app/server
exec ./mealplan-server
