# Stix N Vibes shop

The online shop for Stix N Vibes (shop.stixnvibes.com). Customers browse, customise and fill a cart, then send the whole order to WhatsApp in one tap. An admin panel runs the catalog, collections, offers and orders, and shows what people view and order. Same look as [stixnvibes.com](https://www.stixnvibes.com).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Motion · Supabase (Postgres + Auth + Storage) · Netlify.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000, demo data, no keys needed
```

Without Supabase keys the app runs in **demo mode**: data lives in memory, products that have no price yet get demo prices, and the admin login (`demo@stixnvibes.com` / `demo-admin`) is shown on `/admin/login`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright, desktop + phone, demo mode) |
| `npx jiti scripts/gen-seed.ts` | Rewrites `supabase/seed.sql` from `src/lib/store/seed.ts` |

## How it works

- **Product types**: stickers, sticker sheets, posters, music cards and wall cards. Each product has a base price (blank = "Ask on WhatsApp"), an optional "was" price, a badge, and a status: live, coming soon (shown, can't be ordered) or hidden.
- **Options**: any number of option groups (Size: A4 / A3, Print: normal / sticker, Frame: none / framed, Material: paper vinyl / waterproof). Each choice can add to or take off the base price. Each type has a one-click template.
- **Custom fields**: what the customer fills in, e.g. a Spotify link, a dedication and a photo for a music card. Photos go to a private bucket; the order links to them at `/u/<random id>`.
- **Collections**: group designs (Lo-fi, Anime…). A product can be in several.
- **Offers**: buy X get Y free per product type (stickers: buy 4 get 1; posters: buy 5 get 1). Items are grouped from most to least expensive and the cheapest in each full group are free. The cart nudges ("add 1 more sticker and it's free").
- **Ordering**: the cart lives in the browser. "Order on WhatsApp" sends the cart to the server, which re-prices it from the database, records the order with a ref (`SNV-XXXXXX`) and returns a `wa.me` link with the full order written out. If the server can't be reached, the browser builds the same message itself, so an order is never lost. Payment and delivery are sorted in the WhatsApp chat.
- **Analytics**: product views, add-to-cart, order taps and "Ask on WhatsApp" taps are counted without cookies or personal data.
- **Admin** (`/admin`): dashboard (orders sent, order value, views, conversion, most viewed / ordered, daily chart), orders (status, private notes, customer photos), products (filters, quick hide / sold out / feature, duplicate, full editor with options, custom fields and photos), bulk add (one product per uploaded design), collections, offers, settings (WhatsApp number, notes, banner, pause orders).

## Going live

See [docs/SETUP.md](docs/SETUP.md) for the Supabase and Netlify steps.

## Project layout

```
src/app/(shop)/      storefront pages
src/app/admin/       admin pages and server actions
src/app/api/         order, upload and analytics endpoints
src/lib/pricing.ts   options and offers (shared by browser and server)
src/lib/orders.ts    server-side pricing and order recording
src/lib/whatsapp.ts  WhatsApp links and the order message
src/lib/store/       data layer: Supabase + in-memory demo store, seed catalog
supabase/            SQL migration and starter catalog
tests/               unit (Vitest) and browser (Playwright) tests
```
