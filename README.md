# SIF Web Application

This is the web application for **Sophisticated Instrumentation Facility** of NIT Trichy. It leverages Tanstack Start and other varietry of modern Typescript/Javascript ecosystem to provide an efficient user and developer experience.

# Setup

#### 1. Fork and clone this repository

#### 2. Install dependencies
```bash
pnpm install
```

#### 3. Run the application
```bash
pnpm dev
```

### Production Seeding
```bash
(set -a; source .env; set +a; ./script/seed.sh)
```

### Production Database Migrations
To run database migrations in production using the migrator tool:
```bash
docker compose -f compose.prod.yaml run --rm migrator
```
This uses the `tools` profile, so it won't run with standard `up` commands unless explicitly requested.