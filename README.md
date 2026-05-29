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

### Production Compose Files
There are now two production compose files:

- `compose.prod.yaml` — uses the published DockerHub images:
  - `computerguy0x04/sif:web-latest`
  - `computerguy0x04/sif:migrator-latest`
- `compose.build-prod.yaml` — builds the images locally from the Dockerfile targets.

Use the published-image compose file for normal production deployments:
```bash
docker compose -f compose.prod.yaml up -d
```

Use the build-based compose file when you want to build images locally:
```bash
docker compose -f compose.build-prod.yaml up -d --build
```

### Production Database Migrations
To run database migrations in production using the migrator tool:
```bash
docker compose -f compose.prod.yaml run --rm migrator
```
This uses the `tools` profile, so it won't run with standard `up` commands unless explicitly requested.