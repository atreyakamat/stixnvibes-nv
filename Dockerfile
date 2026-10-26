# Self-hosted shop (home lab or any Docker host). Netlify doesn't use this file.
#   docker compose up -d --build     (settings come from .env, see .env.example)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Inlined at build time by Next.js, so they are build arguments, not runtime settings.
ARG NEXT_PUBLIC_SITE_URL=https://shop.stixnvibes.com
ARG SHOP_DEMO_MODE=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL SHOP_DEMO_MODE=$SHOP_DEMO_MODE NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output: only the server and the packages it uses (~150 MB, not all of node_modules).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
