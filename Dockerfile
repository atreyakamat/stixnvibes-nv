# syntax=docker/dockerfile:1
# Stix N Vibes — multi-stage Dockerfile.
#  - builder   : installs deps + builds the Next.js production app
#  - tests     : runs lint + typecheck + vitest unit tests + Playwright E2E
#  - runner    : slim production image serving standalone Next.js build as non-root user

ARG NODE_VERSION=20

# ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1 \
    CI=true

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

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

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
COPY --from=builder /app/.next ./.next

RUN npx playwright install --with-deps chromium

CMD ["sh", "-c", "npm run lint && npm run typecheck && npx vitest run && npx playwright test"]

# ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
