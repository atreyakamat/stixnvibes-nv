# Admin app API

The Stix N Vibes admin Android app (repo `atreyakamat/stix-admin`) talks to
the shop through `/api/app/admin/*`. Code: `src/lib/admin/app-api.ts`.

- **Same rules as the web admin.** Every change goes through
  `src/lib/admin/ops.ts`, which the web admin's server actions also call, so
  validation and error messages match.
- **No secrets in the app.** The Supabase service key stays on the server. The
  app only ever holds its own login token.
- **No new env vars, no migration.**

## Login and tokens

`POST /api/app/admin/login` with `{ "email", "password" }` checks the same
things as the web login (Supabase Auth password + `ADMIN_EMAILS`; the demo
login on previews) and the same rate limit (8 tries per 15 minutes). It
returns `{ token, expiresAt, email, mode, shopUrl }`.

Send the token as `Authorization: Bearer <token>` on every other call.

- Tokens last 30 days. They use the cookie's signed format, signed with a key
  derived from `ADMIN_SESSION_SECRET` for the app, so a web cookie doesn't
  work as a token and a token doesn't work as a cookie.
- Taking an email off `ADMIN_EMAILS` locks that phone out on its next call.
- Changing `ADMIN_SESSION_SECRET` signs every phone (and browser) out.

## Responses

- Reads return JSON objects (shapes match `src/lib/types.ts`; money is
  always in paise).
- Changes return `{ ok: true, message, id? }`, or `{ ok: false, error }` with
  status 422 and the same message the web admin shows.
- `401` = log in again. `404` = unknown thing. `503` = database not set up.

## Routes

Paths are relative to `/api/app/admin/`.

| Route | What it does |
| --- | --- |
| `GET me` | Who's logged in, store mode, shop URL |
| `GET dashboard` | `?days=1,7,30,90`. Stats, profit goal, warnings, latest orders, next stall |
| `GET analytics` | `?days=7,30,90,365`. Funnel, daily, by type/source/code, low stock, stall takings |
| `GET orders` | `?status=&q=`. Up to 200 orders |
| `GET orders/:n` | One order, its customer page link, how many orders the customer has |
| `PATCH orders/:n` | `{ status?, adminNote? }`. Moves stock like the web admin |
| `POST orders/:n/ship` | `{ trackingNumber, markShipped }`. India Post tracking |
| `GET packing` | Paid orders to pack, confirmed waiting on payment, recently shipped |
| `GET customers` | `?sort=recent,spent,orders&q=` |
| `GET customers/:phone` | One customer and their orders |
| `GET products` | All products (hidden too) and collections |
| `GET products/:id` | One product and collections |
| `POST products` | Create. Body = the web product form's payload |
| `PUT products/:id` | Update. Same payload |
| `DELETE products/:id` | Delete |
| `POST products/:id/quick` | `{ op: live, hidden, upcoming, soldOut, featured }` or `{ op: "stock", stock }` |
| `POST products-bulk` | Bulk add, same payload as the web bulk form |
| `POST images` | Multipart `file` (PNG/JPG/WebP, 5 MB). Returns `{ url }` |
| `GET collections` | All collections |
| `GET collections/:id` | One collection and its product ids |
| `POST collections` | Create |
| `PUT collections/:id` | Update (also syncs which products are in it) |
| `DELETE collections/:id` | Delete |
| `GET offers` | All offers, inactive too |
| `POST offers` | Create, or update when `id` is set |
| `DELETE offers/:id` | Delete |
| `GET coupons` | Codes with how often each was used |
| `POST coupons` | Create (`isNew: "1"`) or update (`"0"`) |
| `DELETE coupons/:code` | Delete |
| `GET custom` | Custom requests |
| `GET custom/:n` | One request and links to its files |
| `PATCH custom/:n` | `{ status, adminNote }` |
| `GET settings` | Settings, plus option choices for the unit costs editor |
| `PUT settings` | The settings form's fields |
| `PUT costs` | `{ costs: [{ key, value }], goal, goalStart, goalBy }` |
| `GET stalls` | Upcoming and past stalls with profit, totals, colleges |
| `GET stalls/:id` | One stall's report, sales and best sellers |
| `POST stalls` | Create |
| `PUT stalls/:id` | Update |
| `DELETE stalls/:id` | Delete |
| `GET stall-mode` | Products, offers and stalls for offline selling |
| `POST stall-sales` | `{ sales: [...] }` from the phone's queue, 1 to 200. Same id twice = stored once |
| `DELETE stall-sales/:id` | Void a sale and put its stock back |
| `GET blog` | Posts, drafts too |
| `GET blog/:id` | One post |
| `POST blog` | Create |
| `PUT blog/:id` | Update |
| `DELETE blog/:id` | Delete |
| `GET gallery` | Photo library, stalls and colleges to tag with |
| `POST gallery` | Add uploaded photos (`images: [url]`) |
| `PUT gallery/:id` | Update one photo |
| `DELETE gallery/:id` | Delete |
| `GET colleges` | College pages |
| `GET colleges/:id` | One college |
| `POST colleges` | Create |
| `PUT colleges/:id` | Update |
| `DELETE colleges/:id` | Delete |

## Trying it on a preview

Netlify deploy previews run in demo mode, so the app can point at a preview
URL and log in with `demo@stixnvibes.com` / `demo-admin` without touching
real data.
