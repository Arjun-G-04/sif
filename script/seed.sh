#!/bin/bash

# Seed script to create admin user if not present
# Runs psql inside the docker container from docker-compose

set -e

# Database connection details
DB_USER="${DB_USER:-db_user}"
DB_PASSWORD="${DB_PASS:-postgres}"
DB_NAME="${DB_NAME:-sif}"

# Admin user details
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
# Password must be pre-hashed and passed as env var
if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}❌ HASHED_PASSWORD environment variable is not set.${NC}"
    exit 1
fi

echo -e "${YELLOW}🌱 Running seed script...${NC}"

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ docker command not found. Please install Docker.${NC}"
    exit 1
fi

# Check if admin user exists and create if not
echo -e "${YELLOW}🔍 Checking if admin user exists...${NC}"

# Check if running in production
COMPOSE_OPTS=""
if [[ "$NODE_ENV" == "production" || "$NODE_ENV" == "prod" ]]; then
    echo -e "${YELLOW}🏭 Running in production mode (using compose.prod.yaml)${NC}"
    COMPOSE_OPTS="-f compose.prod.yaml"
fi

docker compose $COMPOSE_OPTS exec -T db psql -U "$DB_USER" -d "$DB_NAME" <<EOF
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
