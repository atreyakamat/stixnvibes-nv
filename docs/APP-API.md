# App API (Android shop app)

The Stix N Vibes shop app (repo `atreyakamat/stix-app`) reads and writes through
these routes. The app never holds Supabase keys; the database stays locked to
the server.

| Route | What |
| --- | --- |
| `GET /api/app/shop` | Live + upcoming products, active collections, running offers, public settings, colleges, upcoming public stalls, published posts, visible library photos. Cached 60 s. |
| `GET /api/app/order/<SNV-…>?k=<key>` | One order with how to pay (`upi://` link, gateway on/off, WhatsApp). Same key as the order page link; a wrong key is a 404. |
| `POST /api/app/idea` | `{idea, kind: "sticker"\|"poster", seed?}` → a Pollinations image link for an AI sticker idea. Brands, characters and NSFW words are refused. 25 a day per IP. |
| `POST /api/app/idea/keep` | `{idea, kind, seed}` → `{id}`: the server fetches that same picture and keeps it as an upload for `POST /api/custom`. 10 a day per IP. |

The app also uses the existing routes unchanged: `POST /api/order` (with
`source: "app"`), `GET /api/coupon`, `POST /api/upload`, `POST /api/custom`,
`POST /api/pay`, `POST /api/events`.

Never sent to the app: product costs, low-stock levels, unit costs, the profit
goal, admin notes, order view keys of other orders, stall money.
`src/lib/app-api.ts` is the single place that decides what goes out, and
`tests/unit/app-api.test.ts` checks it. Bump `APP_API_VERSION` when a field
changes meaning.

## AI sticker ideas

Free, no account: images come from [Pollinations](https://pollinations.ai)
(`image.pollinations.ai`, Flux model, `safe=true`, `private=true`). The phone
loads the picture straight from Pollinations, so each phone has its own free
rate limit (about one image every 15 s). The server builds every image URL from
the idea, kind and seed in `src/lib/idea.ts`, and never fetches a URL the client
sends. Pollinations may add a small watermark to free images and gives no uptime
guarantee; the app falls back to a normal custom request when it's down. Every
idea still gets checked by hand before anything is printed.
