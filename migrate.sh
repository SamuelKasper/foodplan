#!/usr/bin/env bash

set -euo pipefail

# Fuehrt alle SQL-Migrationen gegen die laufende Docker-Datenbank aus.
# Ausfuehrung aus dem Projektordner: ./migrate.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    echo ".env wurde nicht gefunden: $SCRIPT_DIR/.env" >&2
    exit 1
fi

# shellcheck disable=SC1091
source "$SCRIPT_DIR/.env"

: "${DB_USER:?DB_USER ist nicht in .env gesetzt}"
: "${DB_NAME:?DB_NAME ist nicht in .env gesetzt}"

MIGRATION_DIR="$SCRIPT_DIR/backend/db/migrations"
found_migration=false

for migration in "$MIGRATION_DIR"/*.sql; do
    [[ -e "$migration" ]] || continue
    found_migration=true
    echo "Applying $(basename "$migration") ..."
    docker compose exec -T db \
        psql --single-transaction -v ON_ERROR_STOP=1 \
        -U "$DB_USER" -d "$DB_NAME" < "$migration"
done

if [[ "$found_migration" == false ]]; then
    echo "Keine Migrationen gefunden: $MIGRATION_DIR"
    exit 0
fi

echo "Migrations completed successfully."
