#!/usr/bin/env bash
# Triggers route generation for a city. Server must be running on localhost:3001.
# Usage: ./trigger-routes.sh [cityId]
#   If cityId omitted, uses Marbella (looked up from scout-development DB).
set -e

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTAINER="${CONTAINER:-cityguide-scout-postgres-1}"
API_URL="${API_URL:-http://localhost:3001}"

if [ -n "$1" ]; then
  CITY_ID="$1"
else
  echo "Looking up Marbella city ID..."
  CITY_ID=$(docker exec "$CONTAINER" psql -U postgres -d scout-development -t -c \
    "SELECT id FROM scout.cities WHERE name ILIKE '%marbella%' LIMIT 1;" | tr -d ' \n')
  if [ -z "$CITY_ID" ]; then
    echo "No city named Marbella found. Pass city ID: ./trigger-routes.sh <cityId>"
    exit 1
  fi
  echo "Marbella city ID: $CITY_ID"
fi

echo "Triggering route generation at $API_URL/cities/$CITY_ID/generate-routes ..."
curl -s -m 120 -X POST "$API_URL/cities/$CITY_ID/generate-routes" | jq . 2>/dev/null || cat
echo ""
