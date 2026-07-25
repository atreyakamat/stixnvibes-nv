# Stix N Vibes — Enterprise Commerce & Customization Engine

A world-class, enterprise-grade digital product ecosystem for stickers, posters, Spotify acrylic cards, custom vinyl studio, and mystery packs. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Supabase, Cloudinary, and Razorpay.

---

## Single Unified Command

The entire application—**both Frontend UI & Backend Server APIs** (`/api/checkout`, `/api/spotify/metadata`, `/api/orders/create`, `/api/admin/*`, `/api/analytics/vitals`)—runs seamlessly in a single unified command:

```bash
npm run dev
```

*Access the application at [http://localhost:3000](http://localhost:3000)*

---

## All Commands

| Command | Description |
|---|---|
| `npm run dev` | **Unified Full-Stack Dev Server** (Frontend + Backend APIs at http://localhost:3000) |
| `npm run build` | Production bundle build (compiles all 21 static/dynamic pages) |
| `npm run start` | Start production server |
| `npm run typecheck` | Run TypeScript strict type verification (`tsc --noEmit`) |
| `npm run test:run` | Run complete unit & integration test suite (`vitest run`) |
| `npm run lint` | ESLint static code analysis (`next lint`) |

---

## Docker Support (Run Full Suite in Container)

```bash
# Hot-reload development server inside Docker
docker compose up dev

# Production build served via Next.js inside Docker
docker compose up prod

# Execute entire automated test suite inside container
docker compose run --rm tests
```

---

## Platform Features & Architecture

- **Interactive Live Canvas Customizer**: 2D/3D studio with live transform controls, 300 DPI resolution checker, text typography tools, material finish swatches (Holographic, Glossy, Matte, Clear), and Spotify track metadata auto-lookup.
- **Shop Catalog & Product Engine**: Multi-category filter pipeline, debounced instant search, price band sliders, variant matrices, technical spec sheets, and verified review submissions.
- **Cart & Multi-Gateway Checkout**: Optimistic slide-out cart drawer, coupon engine (`VIBES20`, `VIBES10`), free shipping progress bar, Razorpay online payments (UPI/Cards/NetBanking), and single-tap WhatsApp checkout.
- **Supabase PostgreSQL & Security**: Production database schema (`supabase/schema.sql`) with Row Level Security (RLS) policies, indexes, and automated triggers.
