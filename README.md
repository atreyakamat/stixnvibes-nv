# Stix N Vibes shop

The online shop for Stix N Vibes (shop.stixnvibes.com). Customers browse, customise and fill a cart, place the order and send it to the shop in an Instagram DM. An admin panel runs the catalog, collections, offers and orders, and shows what people view and order. Same look as [stixnvibes.com](https://www.stixnvibes.com).

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

- **Product types**: stickers, sticker sheets, posters, music cards and wall cards. Each product has a base price (blank = "Ask on Instagram"), an optional "was" price, a badge, and a status: live, coming soon (shown, can't be ordered) or hidden.
- **Options**: any number of option groups (Size: A4 / A3, Print: normal / sticker, Frame: none / framed, Material: paper vinyl / waterproof). Each choice can add to or take off the base price. Each type has a one-click template.
- **Custom fields**: what the customer fills in, e.g. a Spotify link, a dedication and a photo for a music card. Photos go to a private bucket; the order links to them at `/u/<random id>`.
- **Collections**: group designs (Lo-fi, Anime…). A product can be in several.
- **Offers**, per product type:
  - Bulk price: from N items, each costs ₹X (sheets ₹65 from 11; wall cards ₹25 from 6, ₹20 from 11).
  - Buy X get Y free (stickers: buy 4 get 1; posters: buy 5 get 1). Items are grouped from most to least expensive and the cheapest in each full group are free.
  - The cart nudges ("add 1 more sticker and it's free", "add 2 more wall cards to pay ₹25 each").
- **Minimum per order** per product (music cards: 5). Checkout waits until it's met.
- **Free shipping** above a set amount (₹250), with a cart nudge.
- **Ordering**: the cart lives in the browser. "Place order" sends the cart to the server, which re-prices it from the database, records the order with a ref (`SNV-XXXXXX`) and opens the customer's order page. Instagram can't prefill a DM, so the order page copies the full order and opens `ig.me/m/<account>` for the customer to paste it. If the server can't be reached, the browser builds the same message itself, so an order is never lost. Payment and delivery are sorted in the Instagram chat.
- **Analytics**: visits, product views, add-to-cart, checkouts, orders and "Ask on Instagram" taps are counted without cookies or personal data. A visit from `?src=stall-x` (or `utm_source`) is remembered for 30 days so orders and sales show per stall or link.
- **Codes**: % or ₹ off after offers, with optional dates, minimum order and use limit. `?code=X` on any link applies it in the cart; each code has a printable QR card. The server checks the code again when the order is placed.
- **Stock**: optional count per product, taken when an order is confirmed and given back if it's cancelled. Low stock shows on the dashboard; the shop says "Only N left" and stops at zero.
- **Custom requests** (`/custom`): the customer uploads up to 6 designs, says what to make and how many, and gets a `CUS-XXXXXX` ref. With Resend set up, each order and request is emailed to the owner.
- **Payments**: optional "Pay now" through YouPI PG on the home lab, falling back to the UPI QR and a WhatsApp button when it's off or down. A signed webhook marks the order paid. Customers can download the QR and a receipt. See [docs/PAYMENTS.md](docs/PAYMENTS.md).
- **Cricut sheets** (`/admin/sheets`): packs designs onto Print Then Cut sheets (shelf packing, white cut border, 300 DPI PNG with its DPI set).
- **Admin** (`/admin`): dashboard (orders sent, order value, views, conversion, most viewed / ordered, daily chart), orders (status, private notes, customer photos), products (filters, quick hide / sold out / feature, duplicate, full editor with options, custom fields and photos), bulk add (one product per uploaded design), collections, offers, settings (Instagram account, notes, banner, pause orders).

## Going live

See [docs/SETUP.md](docs/SETUP.md) for the Supabase and Netlify steps.

## Project layout

```
src/app/(shop)/      storefront pages
src/app/admin/       admin pages and server actions
src/app/api/         order, upload and analytics endpoints
src/lib/pricing.ts   options and offers (shared by browser and server)
src/lib/orders.ts    server-side pricing and order recording
src/lib/instagram.ts Instagram DM links and the order message
src/lib/store/       data layer: Supabase + in-memory demo store, seed catalog
supabase/            SQL migration and starter catalog
tests/               unit (Vitest) and browser (Playwright) tests
```
