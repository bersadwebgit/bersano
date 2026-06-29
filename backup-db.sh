#!/bin/bash
# This script creates a backup of the PostgreSQL database from the running docker container.
# It works on Linux/macOS.

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

echo "Starting database backup..."
docker compose exec -T postgres pg_dump -U postgres shop_final > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Database backup successfully saved to $BACKUP_FILE"
else
  echo "Database backup failed! Please make sure the postgres container is running."
  exit 1
fi
