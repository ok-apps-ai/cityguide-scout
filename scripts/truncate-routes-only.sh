#!/usr/bin/env bash
# Truncates only routes and route_stops. Keeps cities and places.
# Run from repo root. Requires docker with postgres container.
set -e

CONTAINER="${1:-cityguide-scout-postgres-1}"
DB="${2:-scout-development}"

echo "Truncating scout.route_stops, scout.routes in $DB via $CONTAINER..."

docker exec "$CONTAINER" psql -U postgres -d "$DB" -c "
  TRUNCATE scout.route_stops, scout.routes CASCADE;
"

echo "Done. Routes cleared. Cities and places unchanged."
