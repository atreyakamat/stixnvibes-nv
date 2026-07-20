# Stix N Vibes

A premium e-commerce experience for stickers, posters, Spotify cards, frames, and mystery packs. Built with Next.js 14, TypeScript, Tailwind, and Framer Motion. Dark-first, vibrant brand identity.

This repository currently contains **Phase 1**: project scaffold, the full design system, navbar/footer/motion helpers, typed mock catalog, environment-gated integration stubs (Supabase/Cloudinary/Razorpay), and a polished animated homepage.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in keys when ready
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |

See `AGENTS.md` for architecture, integration TODOs, and brand conventions.

## Status — Phase 1

- [x] Next.js 14 + TS + Tailwind scaffold
- [x] Design tokens (yellow/red/orange/purple), dark-first brand identity
- [x] shadcn/ui-style primitives (Button CVA, Card, Badge, Separator)
- [x] Layout primitives (Container, Section, SectionHeader, Kicker, Navbar w/ mega menu, Footer, ThemeToggle)
- [x] Motion helpers (Reveal, StaggerGroup, StaggerItem)
- [x] Typed mock catalog (`src/lib/data/products.ts`)
- [x] Env-gated integration stubs (Supabase, Cloudinary, Razorpay)
- [x] Homepage: Hero, Featured Categories, Best Sellers, New Arrivals, Customize Showcase, Trending Collections, Why Choose Us, Reviews, Instagram Feed, Newsletter
- [x] SEO: sitemap.ts, robots.ts, manifest.ts, OpenGraph/Twitter metadata, JSON-LD Store schema
- [ ] Phase 2: Shop index, category & product detail pages
- [ ] Phase 3: Live customizer, cart, checkout
- [ ] Phase 4: Backend wiring (Supabase schema + RLS, file uploads, Razorpay verify)
- [ ] Phase 5: Analytics, performance pass, deployment
