#!/bin/bash

# Database Backup Script
# Creates a compressed PostgreSQL backup from the docker container and stores it in the root backups folder.

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection details with sensible defaults matching compose configs
DB_USER="${DB_USER:-db_user}"
DB_NAME="${DB_NAME:-sif}"

# Determine root directory of the repository (where this script resides + one level up)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"

echo -e "${BLUE}📦 Database Backup Utility${NC}"

# Check if docker command is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ docker command not found. Please install Docker.${NC}"
    exit 1
fi

# Always use compose.prod.yaml for docker compose commands
COMPOSE_OPTS="-f compose.prod.yaml"
echo -e "${YELLOW}🐳 Using Compose File: compose.prod.yaml${NC}"


# Ensure backups directory exists
mkdir -p "$BACKUP_DIR"

# Generate a unique timestamped filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

echo -e "${YELLOW}🔍 Checking database container status...${NC}"

# Find the status of the database container
# We target the service name 'db' matching the docker-compose config
CONTAINER_STATUS=$(docker compose $COMPOSE_OPTS ps --format json db 2>/dev/null || docker compose $COMPOSE_OPTS ps db 2>/dev/null || echo "")

# Ensure the db container is running
if [[ -z "$CONTAINER_STATUS" || "$CONTAINER_STATUS" == *"Exit"* || "$CONTAINER_STATUS" == *"paused"* ]]; then
    echo -e "${RED}❌ Database container 'db' is not running. Please start the services first (e.g., via docker compose up).${NC}"
    exit 1
fi

echo -e "${YELLOW}💾 Dumping database '$DB_NAME' as user '$DB_USER'...${NC}"

# Run pg_dump within the container and pipe the output to a compressed file on the host
# Using -T to disable pseudo-TTY allocation which is not needed for scripts
if docker compose $COMPOSE_OPTS exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    # Verify backup file size is greater than 0
    if [ -s "$BACKUP_FILE" ]; then
        FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Database backup completed successfully!${NC}"
        echo -e "${GREEN}📁 Saved to: $BACKUP_FILE ($FILE_SIZE)${NC}"
        
        # List the recent backups
        echo -e "\n${BLUE}🕒 Recent Backups in $BACKUP_DIR:${NC}"
        ls -lh "$BACKUP_DIR" | tail -n 5
    else
        echo -e "${RED}❌ Backup file is empty. Something went wrong during pg_dump.${NC}"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo -e "${RED}❌ Database dump failed.${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi
