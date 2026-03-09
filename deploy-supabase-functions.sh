#!/bin/bash
# deploy-supabase-functions.sh
# Automatically deploy all Supabase SQL functions

# Configuration
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"

echo "🚀 Deploying Supabase Functions..."

# SQL files in order
SQL_FILES=(
  "database/functions/01_create_rides.sql"
  "database/functions/02_matching.sql"
  "database/functions/03_match_management.sql"
  "database/functions/04_seat_management.sql"
  "database/functions/05_auto_create_triggers.sql"
  "database/functions/06_idempotent_matching.sql"
  "database/functions/07_match_workflow_updates.sql"
  "database/functions/08_enforce_capacity.sql"
  "database/functions/09_standardize_match_functions.sql"
)

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase whoami &> /dev/null; then
    echo "❌ Not logged in. Run: supabase login"
    exit 1
fi

# Deploy each file
for file in "${SQL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 Deploying: $file"
        supabase db push --db-url "$SUPABASE_URL" || {
            echo "❌ Failed to deploy $file"
            exit 1
        }
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "✅ All functions deployed successfully!"
