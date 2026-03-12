#!/usr/bin/env bash
# Cleans scout-development, restores latest backup.
# Run from repo root. Requires docker with postgres container.
set -e

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUPS_DIR="$REPO_ROOT/backups"
CONTAINER="${1:-cityguide-scout-postgres-1}"

LATEST_BACKUP=$(ls -t "$BACKUPS_DIR"/scout-development-*.sql 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "No backup found in $BACKUPS_DIR"
  exit 1
fi

echo "Latest backup: $LATEST_BACKUP"
echo "Cleaning and restoring scout-development via $CONTAINER..."

docker exec "$CONTAINER" psql -U postgres -d scout-development -c "
  TRUNCATE scout.route_stops, scout.routes, scout.places, scout.cities CASCADE;
"

docker exec -i "$CONTAINER" psql -U postgres -d scout-development < "$LATEST_BACKUP"

echo "Done. scout-development now has data from $LATEST_BACKUP"
echo ""
echo "To generate routes, start server and call:"
echo "  curl -X POST http://localhost:3001/cities/{cityId}/generate-routes"
echo ""
echo "Marbella city ID: 1b2aa715-cedf-4479-b60a-6475a1a0c634"
