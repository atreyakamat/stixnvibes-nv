# Stix N Vibes — Engineering Notes

## Stack
- Next.js 14.2 (App Router) + React 18 + TypeScript (strict)
- Tailwind CSS 3.4 with brand design tokens (`src/app/globals.css`)
- shadcn/ui-style primitives under `src/components/ui/`
- Framer Motion for animation (`src/components/motion/`)
- next-themes for dark/light
- Examples: Supabase (`@supabase/ssr`), Cloudinary, Razorpay (stubs with env placeholders)

## Commands
- `npm run dev` — start dev server on :3000
- `npm run build` — production build
- `npm run lint` — eslint (next/core-web-vitals)
- `npm run typecheck` — tsc --noEmit
- `npm test` — vitest (watch mode)
- `npm run test:run` — vitest single-run (unit tests)
- `npm run test:e2e` — Playwright E2E (needs `npm run build` first)
- `npm run test:e2e:install` — install Playwright browsers

Run lint AND typecheck before declaring a coding task complete.

## Docker (run the whole suite in a container)
- `docker compose run --rm tests` — builds the tests image and runs lint + typecheck + vitest + Playwright end-to-end
- `docker compose up dev` — hot-reload dev server on http://localhost:3000 inside Docker
- `docker compose up prod` — production build served via `next start` inside Docker

## Architecture
```
src/
  app/               # App Router: layout, page, sitemap, robots, manifest, globals.css
  components/
    ui/              # primitives (button, card, badge, separator, index barrel)
    layout/          # navbar, footer, theme-toggle, container, section, section-header
    motion/          # reveal.tsx (Reveal, StaggerGroup, StaggerItem helpers)
    home/            # homepage sections
    product/         # product-card
    theme/           # theme-provider (next-themes wrapper)
  lib/
    data/            # typed mock products + reviews + instagram
    supabase/        # browser + service clients (env-gated)
    payment/         # razorpay server helpers (env-gated)
    cloudinary.ts    # image url builder + env check
    site-config.ts   # nav structure + brand
    utils.ts         # cn, formatPrice, slugify, etc.
```

## Brand
- Primary bright yellow (#FFB200 → var --brand-yellow) + hot red (#E5261F → var --brand-red)
- Accents: orange (#FF5A1F) + purple (#9C4DD6)
- Dark-first, light theme supported
- Fonts: Inter (sans), Space Grotesk (display)
- Radius: 0.75rem base
- Animations: Framer Motion (Reveal + StaggerGroup + StaggerItem helpers in components/motion/reveal.tsx)

## Conventions
- Use the `Reveal` and `StaggerGroup` motion helpers, not bespoke motion blocks, for scroll-revealed content.
- Use the `Button` CVA variants: `default | gradient | accent | outline | secondary | ghost | destructive | link`. Sizes include `xl` for hero CTAs.
- Use the `Container`, `Section`, `SectionHeader`, `Kicker` layout primitives. Do not invent bespoke wrapping divs.
- Use the `ProductCard` component for any product listing on the homepage or future shop pages.
- All animations should respect `viewport={{ once: true, margin: "-80px" }}` to avoid replay jank.
- Mock product data lives in `src/lib/data/products.ts` typed to `Product`. When wiring Supabase, mirror this exact shape via the schema.sql TODO.
- Cloudinary is preferred over remote Unsplash URLs in production.

## Backend integration TODOs (env-gated already)
- Supabase: `src/lib/supabase/client.ts` returns null until `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Create `supabase/schema.sql` mirroring the `Product` interface to seed.
- Cloudinary: `src/lib/cloudinary.ts` builds signed URLs once `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set. Replace Unsplash URLs in `products.ts` with `cloudinaryUrl(publicId)`.
- Razorpay: endpoint helpers in `src/lib/payment/razorpay.ts`. Add server action `src/app/api/checkout/route.ts` to call `createRazorpayOrder` and a `verify` endpoint.

## Pages TODO (Phase 2+)
- `/shop` index + category pages with filter sidebar
- Product detail `app/shop/[slug]/page.tsx` with gallery, variants, reviews, related, specs
- `/customize/*` with live preview customizer
- Cart drawer + `/checkout` flow
- About, FAQ, Contact, Policies, Account — already in `navStructure` in `lib/site-config.ts`

## Performance targets
- Lighthouse 95+
- LCP < 2.5s — Hero is client component, defer the rest of the hero image to Cloudinary on switch
- All `img` use `loading="lazy"` beyond the hero; switch to `next/image` when Cloudinary is wired and the blurDataURL is available
- The marquee strip uses `animate-marquee` (CSS) to avoid JS cost
