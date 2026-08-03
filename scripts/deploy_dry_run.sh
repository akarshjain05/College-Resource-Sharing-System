#!/usr/bin/env bash
# Dry-run script to inspect pending Alembic migrations before applying them
set -e

# Load environment variables if running locally, otherwise rely on docker env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "=== Pending Alembic Migrations Dry-Run ==="
echo "Generating SQL for pending migrations (if any)..."
echo "------------------------------------------------"

# Run alembic in offline mode to dump SQL to stdout
cd backend
alembic upgrade head --sql

echo "------------------------------------------------"
echo "Review the above SQL. If it looks safe, you can apply migrations normally."
