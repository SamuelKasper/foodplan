#!/bin/bash

set -euo pipefail

# .env laden
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.env"

BACKUP_DIR="$SCRIPT_DIR/backup"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="dump_${TIMESTAMP}.sql"

: "${DB_USER:?DB_USER is not set}"
: "${DB_NAME:?DB_NAME is not set}"

mkdir -p "$BACKUP_DIR"

echo "Creating backup of database '$DB_NAME' as user '$DB_USER'..."

docker compose exec -T db \
    pg_dump -U "$DB_USER" -d "$DB_NAME" \
    > "$BACKUP_DIR/$FILENAME"

echo "Backup saved: $BACKUP_DIR/$FILENAME"