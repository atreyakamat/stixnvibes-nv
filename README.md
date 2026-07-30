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

---

## Database Architecture & Relational Integrity

The Stix N Vibes database architecture, entity relationship diagram, and gaps are documented in the following artifacts:
- **Entity Relationship Diagram (ERD)**: See [database_erd.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_erd.md)
- **Detailed Database Architecture**: See [database_architecture.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_architecture.md)
- **Gap Analysis & Hardening Verdict**: See [database_gap_analysis.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_gap_analysis.md)
- **Hardening Cross-Examination Report**: See [database_hardening_cross_exam.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_hardening_cross_exam.md)
- **Entity Relationship & Integrity Matrix**: See [database_relationship_matrix.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_relationship_matrix.md)
- **Database Data Flow Diagram**: See [database_data_flow.md](file:///C:/Projects/stixnvibes-nv/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_data_flow.md) or the locally stored [database_data_flow.md](file:///C:/Users/atkam/.gemini/antigravity-cli/brain/64d9c92b-4c18-44c9-a25c-c49e27cf4204/database_data_flow.md)

