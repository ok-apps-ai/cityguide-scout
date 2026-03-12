#!/usr/bin/env bash
set -e

BACKUP="${1:-backups/scout-development-20260311-165321.sql}"
CONTAINER="${2:-cityguide-scout-postgres-1}"
TARGET_DB="${3:-scout-test}"

echo "Restoring $BACKUP to $TARGET_DB via $CONTAINER..."

docker exec "$CONTAINER" psql -U postgres -d "$TARGET_DB" -c "
  TRUNCATE scout.route_stops, scout.routes, scout.places, scout.cities CASCADE;
"

docker exec -i "$CONTAINER" psql -U postgres -d "$TARGET_DB" < "$BACKUP"

echo "Done. $TARGET_DB now has backup data."
