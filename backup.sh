#!/bin/bash

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="dump_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" > "${BACKUP_DIR}/${FILENAME}"

if [ $? -eq 0 ]; then
    echo "Backup saved: ${BACKUP_DIR}/${FILENAME}"
else
    echo "Backup failed."
    exit 1
fi
