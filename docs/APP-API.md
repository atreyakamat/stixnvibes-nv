# App API (Android shop app)

The Stix N Vibes shop app (repo `atreyakamat/stix-app`) reads and writes through
these routes. The app never holds Supabase keys; the database stays locked to
the server.

| Route | What |
| --- | --- |
| `GET /api/app/shop` | Live + upcoming products, active collections, running offers, public settings, colleges, upcoming public stalls, published posts, visible library photos. Cached 60 s. |
| `GET /api/app/order/<SNV-…>?k=<key>` | One order with how to pay (`upi://` link, gateway on/off, WhatsApp). Same key as the order page link; a wrong key is a 404. |

The app also uses the existing routes unchanged: `POST /api/order` (with
`source: "app"`), `GET /api/coupon`, `POST /api/upload`, `POST /api/custom`,
`POST /api/pay`, `POST /api/events`.

Never sent to the app: product costs, low-stock levels, unit costs, the profit
goal, admin notes, order view keys of other orders, stall money.
`src/lib/app-api.ts` is the single place that decides what goes out, and
`tests/unit/app-api.test.ts` checks it. Bump `APP_API_VERSION` when a field
changes meaning.
