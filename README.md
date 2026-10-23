# Stix N Vibes shop

The online shop for Stix N Vibes (shop.stixnvibes.com): catalog, cart, UPI checkout, order tracking, custom sticker requests and an admin panel to run it all. Same look as [stixnvibes.com](https://www.stixnvibes.com).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Motion · Supabase (Postgres + Auth + Storage) · Netlify.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000, demo data, no keys needed
```

Without Supabase keys the app runs in **demo mode**: data lives in memory, products have demo prices, and the admin login (`demo@stixnvibes.com` / `demo-admin`) is shown on `/admin/login`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright, desktop + mobile, demo mode) |

## How it works

- **Catalog**: products with options (size, finish…), each with its own price and optional stock. A blank price means "not for sale yet": it shows on the shop with an Instagram link instead of a cart button.
- **Cart**: kept in the browser. The server re-prices every line from the database, so a tampered cart can't change a price.
- **Checkout**: ship to an address, or free pickup (if turned on). Payment is UPI: the order page shows a QR code (desktop) or an "Open UPI app" button (phone) with the exact amount and order number filled in. The customer then enters their 12 digit UPI reference (UTR). Pickup orders can also be "pay at pickup".
- **Payment check**: in admin, "Payments to check" lists orders with a UTR. Match the amount and UTR in your bank or UPI app, then click **Mark paid** (or **Reject payment** to let the customer fix it). One UTR can only ever be used for one order.
- **Stock**: taken atomically when the order is placed (a Postgres function), and put back if an order is cancelled.
- **Order flow**: awaiting payment → checking payment → paid → packed → shipped → delivered. Pickup: placed → packed → ready for pickup → collected. Every step is logged on the order.
- **Customers** see their order at a private link (`/order/SNV-XXXXXX?k=…`) or look it up on `/track` with order number + phone.
- **Admin** (`/admin`): dashboard (to-dos, money in), orders (filters, search, status buttons, courier/tracking, private notes, one-tap WhatsApp message to the customer), products (create/edit, options, prices, stock, photo upload), custom requests (with uploaded artwork), settings (open/close shop, UPI ID, shipping fee, free-shipping threshold, pickup).

Swapping UPI for a payment gateway later means adding a payment method next to `src/lib/payments/upi.ts` and a webhook route; the order statuses already cover it.

## Going live

See [docs/SETUP.md](docs/SETUP.md) for the Supabase and Netlify steps.

## Project layout

```
src/app/(shop)/      storefront pages
src/app/admin/       admin pages and server actions
src/app/api/         checkout, quote, UTR, tracking, custom request endpoints
src/lib/store/       data layer: Supabase + in-memory demo store
src/lib/orders/      pricing, statuses, order service
src/lib/payments/    UPI links and UTR checks
supabase/            SQL migration and starter catalog
tests/               unit (Vitest) and browser (Playwright) tests
```
