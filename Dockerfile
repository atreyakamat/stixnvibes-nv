# syntax=docker/dockerfile:1
# Stix N Vibes — multi-stage Dockerfile.
#  - builder   : installs deps + builds the Next.js production app
#  - tests      : runs lint + typecheck + vitest unit tests + Playwright E2E
#  - runner     : slim final image serving `next start`

ARG NODE_VERSION=20

# ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/usr/local/bin \
    CI=true

WORKDIR /app

# Install OS deps needed for builds and Playwright browsers later.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first to leverage Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source & build.
COPY . .
RUN npm run build

# ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS tests

ENV NEXT_TELEMETRY_DISABLED=1 \
    CI=true \
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key \
    NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999 \
    NEXT_PUBLIC_SITE_URL=https://stixnvibes.com

WORKDIR /app

# Playwright OS deps + browsers
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

# Copy the build output from the builder stage so Playwright can run `next start`
COPY --from=builder /app/.next ./.next

# Install Playwright browsers + dependencies
RUN npx playwright install --with-deps chromium

# Default test command — runs unit + lint + typecheck + E2E
CMD ["sh", "-c", "npm run lint && npm run typecheck && npx vitest run && npx playwright test"]
