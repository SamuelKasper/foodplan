#!/usr/bin/env bash

# Synchronisiert die Live-Datenbank in die lokale Docker-Datenbank.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Lokale Zugangsdaten werden nur für den Restore benötigt.
source "$SCRIPT_DIR/.env"
: "${DB_USER:?DB_USER is not set}"
: "${DB_NAME:?DB_NAME is not set}"

# Bei abweichender Serverstruktur vor dem Aufruf überschreiben, z. B.:
# SERVER_PROJECT_DIR=/opt/foodplan ./down-sync.sh
SERVER_USER="${SERVER_USER:-samu}"
SERVER_HOST="${SERVER_HOST:-87.106.19.14}"
SERVER_PROJECT_DIR="${SERVER_PROJECT_DIR:-/home/samu/projects/foodplan}"
SERVER_DUMP_DIR="${SERVER_DUMP_DIR:-/tmp/foodplan-downsync}"
LOCAL_DUMP_DIR="$SCRIPT_DIR/dump"

# Docker Compose und die lokale .env müssen aus dem Projektverzeichnis gelesen werden.
cd "$SCRIPT_DIR"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
FILENAME="dump_${TIMESTAMP}.sql"
LOCAL_DUMP_FILE="$LOCAL_DUMP_DIR/$FILENAME"
SERVER="$SERVER_USER@$SERVER_HOST"

mkdir -p "$LOCAL_DUMP_DIR"

echo "Erstelle Datenbank-Dump auf $SERVER ..."
ssh "$SERVER" 'bash -s' -- "$SERVER_PROJECT_DIR" "$SERVER_DUMP_DIR" "$FILENAME" <<'REMOTE_SCRIPT'
set -euo pipefail

project_dir="$1"
dump_dir="$2"
filename="$3"

cd "$project_dir"
umask 077
mkdir -p "$dump_dir"
chmod 700 "$dump_dir"

# Die Zugangsdaten stammen aus den Umgebungsvariablen des PostgreSQL-Containers.
docker compose exec -T db sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    > "$dump_dir/$filename"

test -s "$dump_dir/$filename"
REMOTE_SCRIPT

echo "Lade Dump herunter ..."
scp "$SERVER:$SERVER_DUMP_DIR/$FILENAME" "$LOCAL_DUMP_FILE"
test -s "$LOCAL_DUMP_FILE"

echo "Spiele Dump in die lokale Datenbank '$DB_NAME' ein ..."
docker compose exec -T db psql \
    --single-transaction \
    -v ON_ERROR_STOP=1 \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    < "$LOCAL_DUMP_FILE"

echo "Downsync erfolgreich abgeschlossen: $LOCAL_DUMP_FILE"
