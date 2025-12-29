# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.12.0
ARG PNPM_VERSION=9.15.0

# Base stage
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}
# Alternatively use corepack:
# RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Migrator stage
# This stage has the full source and devDependencies (tsx), 
# allowing us to run migrations with drizzle-kit using the TS config.
FROM builder AS migrator
# Default command to run migrations, can be overridden
CMD ["pnpm", "db:migrate"]

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy necessary files for running the server
# Nitro/TanStack Start builds usually output to .output
COPY --from=builder /app/.output ./.output

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
