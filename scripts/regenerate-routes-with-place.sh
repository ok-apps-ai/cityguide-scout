#!/usr/bin/env bash
# Truncates routes only, triggers route generation.
# Keeps cities and places. Server must be running on localhost:3001.
set -e

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
CITY_ID="${1:-}"
API_URL="${2:-http://localhost:3001}"
CONTAINER="${CONTAINER:-cityguide-scout-postgres-1}"

if [ -z "$CITY_ID" ]; then
  echo "Looking up Marbella city ID..."
  CITY_ID=$(docker exec "$CONTAINER" psql -U postgres -d scout-development -t -c \
    "SELECT id FROM scout.cities WHERE name ILIKE '%marbella%' LIMIT 1;" | tr -d ' \n')
  if [ -z "$CITY_ID" ]; then
    echo "No city named Marbella found. Pass city ID: $0 <cityId>"
    exit 1
  fi
fi

echo "1. Truncating routes and route_stops only (keeping cities, places)..."
sh "$SCRIPT_DIR/truncate-routes-only.sh"

echo ""
echo "2. Triggering route generation for city $CITY_ID..."
curl -s -m 120 -X POST "$API_URL/cities/$CITY_ID/generate-routes" | jq . 2>/dev/null || cat

echo ""
echo "Done."
