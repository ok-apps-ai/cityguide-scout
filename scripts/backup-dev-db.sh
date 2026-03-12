#!/usr/bin/env bash
# Backs up scout-development to backups/scout-development-YYYYMMDD-HHMMSS.sql
# Run from repo root. Requires docker with postgres container.
set -e

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUPS_DIR="$REPO_ROOT/backups"
CONTAINER="${1:-cityguide-scout-postgres-1}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUPS_DIR/scout-development-$TIMESTAMP.sql"

mkdir -p "$BACKUPS_DIR"

echo "Backing up scout-development to $BACKUP_FILE via $CONTAINER..."
docker exec "$CONTAINER" pg_dump -U postgres -d scout-development > "$BACKUP_FILE"
echo "Done. Backup saved to $BACKUP_FILE"
