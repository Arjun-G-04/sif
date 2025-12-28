#!/bin/bash

# Seed script to create admin user if not present
# Runs psql inside the docker container from docker-compose

set -e

# Database connection details (from compose.yaml)
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-sif}"

# Admin user details
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-pass}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🌱 Running seed script...${NC}"

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ docker command not found. Please install Docker.${NC}"
    exit 1
fi

# Hash password using bcrypt (same as the app uses)
echo -e "${YELLOW}🔐 Hashing admin password...${NC}"
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcrypt'); bcrypt.hash('$ADMIN_PASSWORD', 10).then(h => console.log(h));" 2>/dev/null)

if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}❌ Failed to hash password. Make sure npx is available.${NC}"
    exit 1
fi

# Check if admin user exists and create if not
echo -e "${YELLOW}🔍 Checking if admin user exists...${NC}"

docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = '$ADMIN_USERNAME') THEN
        INSERT INTO users (username, password, role) 
        VALUES ('$ADMIN_USERNAME', '$HASHED_PASSWORD', 'admin');
        RAISE NOTICE 'Admin user created successfully!';
    ELSE
        RAISE NOTICE 'Admin user already exists, skipping...';
    END IF;
END
\$\$;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Seed script completed successfully!${NC}"
else
    echo -e "${RED}❌ Seed script failed.${NC}"
    exit 1
fi
