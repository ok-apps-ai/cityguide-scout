#!/usr/bin/env bash
# Adds Marbella, Spain via POST /cities. Triggers POI collection (Google + OSM) and route generation.
# Server and scout must be running. Run from repo root.
set -e

API_URL="${API_URL:-http://localhost:3001}"

echo "Adding Marbella, Spain via $API_URL/cities (triggers collection + route generation)..."
RESPONSE=$(curl -s -m 600 -X POST "$API_URL/cities" \
  -H "Content-Type: application/json" \
  -d '{"name":"Marbella, Spain","southwest":{"lat":36.47,"lng":-4.99},"northeast":{"lat":36.53,"lng":-4.73}}' 2>/dev/null || true)

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Marbella added. Collection and route generation complete."
else
  echo "API not reachable. Ensure server (port 3001) and scout are running, then run:"
  echo "  curl -X POST $API_URL/cities -H 'Content-Type: application/json' -d '{\"name\":\"Marbella, Spain\",\"southwest\":{\"lat\":36.47,\"lng\":-4.99},\"northeast\":{\"lat\":36.53,\"lng\":-4.73}}'"
  exit 1
fi
