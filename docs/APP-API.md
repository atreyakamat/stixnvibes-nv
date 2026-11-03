# App API (Android shop app)

The Stix N Vibes shop app (repo `atreyakamat/stix-app`) reads and writes through
these routes. The app never holds Supabase keys; the database stays locked to
the server.

| Route | What |
| --- | --- |
| `GET /api/app/shop` | Live + upcoming products, active collections, running offers, public settings, colleges, upcoming public stalls, published posts, visible library photos, published reviews (no order number or Instagram; photos as `/u/<id>` links; `verified` flag). Cached 60 s. |
| `GET /api/app/order/<SNV-…>?k=<key>` | One order with how to pay (`upi://` link, gateway on/off, WhatsApp). Same key as the order page link; a wrong key is a 404. |
| `POST /api/reviews` | `{productId, rating 1-5, text, name, instagram, photos: uploadIds[], orderNumber?, key?}` → `{id}`. Saved as pending; shows once published in admin. With the order's number + key (order paid/shipped/done, product in it) it's marked as a verified buyer. 6 an hour per IP. Also used by the website. |
| `POST /api/app/idea` | `{idea, kind: "sticker"\|"poster", seed?}` → a Pollinations image link for an AI sticker idea. Brands, characters and NSFW words are refused. 25 a day per IP. |
| `POST /api/app/idea/keep` | `{idea, kind, seed}` → `{id}`: the server fetches that same picture and keeps it as an upload for `POST /api/custom`. 10 a day per IP. |
| `POST /api/app/account/code` | `{email}` → emails a 6-digit code (10 minutes, one every 45 s, 8 an hour per IP). Same reply whether or not the email has an account. `503` when sign-in mail isn't set up. In demo mode (previews) the reply carries `demoCode` instead of sending mail. |
| `POST /api/app/account/verify` | `{email, code, name?, web?}` → `{token, expiresAt, account, isNew}`. A new email gets an account. `web: true` sets the website cookie instead of returning a token. Five wrong guesses kill the code. |
| `GET/PUT/DELETE /api/app/account` | Bearer token (app) or `snv_customer` cookie (website). `PUT {name, data: {details, taste, orders}}` replaces details and taste; order links only ever grow. `DELETE` removes the account (orders stay). |
| `POST /api/app/account/logout` | Website sign-out (clears the cookie). The app just forgets its token. |

`GET /api/app/shop` has `accounts: true` when sign-in can work, so the app hides
the sign-in screens until then. `POST /api/order` links the new order to the
signed-in customer if a token or cookie is sent; guest orders are unchanged.

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

## Customer accounts

Optional. A customer signs in with an emailed code (no passwords). An account
keeps their saved details, college and vibes, wishlist and links to their
orders (number + private key), so they follow them to a new phone and the
website. Tokens last 90 days and are signed with a key derived from
`ADMIN_SESSION_SECRET` that admin cookies and admin app tokens can't be replayed
as, so there are no new secrets. Codes are stored hashed in `login_codes`.

To turn it on in production:

1. Run `supabase/migrations/0006_accounts.sql` in the Supabase SQL editor.
2. Resend can only email other people from a verified domain: add one in the
   Resend account (free), then set `MAIL_FROM` (for example
   `Stix N Vibes <hello@stixnvibes.com>`). `RESEND_API_KEY` is already set for
   owner mail. Until then `accounts` stays `false` in the app feed and nothing
   changes for customers.
