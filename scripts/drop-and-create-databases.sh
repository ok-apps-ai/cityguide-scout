#!/usr/bin/env bash
# Drops scout-development and scout-test, recreates them, runs migrations.
# No backup is applied — databases are empty after this.
# Run from repo root. Requires docker with postgres container.
# Stop scout and any DB clients before running.
set -e

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTAINER="${1:-cityguide-scout-postgres-1}"
SCOUT_DIR="$REPO_ROOT/services/scout"

# Default postgres URL for migrations (matches .env.sample)
POSTGRES_BASE="${POSTGRES_URL_BASE:-postgres://postgres:password@127.0.0.1}"

echo "Stopping connections to scout-development and scout-test..."
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname IN ('scout-development', 'scout-test') AND pid <> pg_backend_pid();
"

echo "Waiting for connections to close..."
sleep 2

echo "Dropping and recreating databases via $CONTAINER..."
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "scout-development";'
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE "scout-development";'
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "scout-test";'
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE "scout-test";'

echo "Databases recreated. Running migrations..."

cd "$SCOUT_DIR"
npm run build

POSTGRES_URL="${POSTGRES_BASE}/scout-development" npx typeorm migration:run -d dist/infrastructure/database/data-source.js
POSTGRES_URL="${POSTGRES_BASE}/scout-test" npx typeorm migration:run -d dist/infrastructure/database/data-source.js

echo "Done. scout-development and scout-test are empty (schema only, no data)."
echo ""
echo "Adding Marbella, Spain via API (triggers POI collection + route generation)..."
"$SCRIPT_DIR/add-marbella-via-api.sh" || echo "  Skipped (API not reachable). Start server and scout, then run: npm run --prefix ./services/scout db:add-marbella"
