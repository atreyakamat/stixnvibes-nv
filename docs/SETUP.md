# Going live: Supabase + Netlify

About 20 minutes. Nothing here costs money on the free tiers.

## 1. Supabase (database, admin logins, photo storage)

1. Create a project at supabase.com (free tier is fine). Region: Mumbai (`ap-south-1`).
2. **SQL Editor → New query**: paste and run `supabase/migrations/0001_shop.sql`, then `supabase/seed.sql`. This creates the tables, the dashboard stats function, two storage buckets, the Lo-fi collection with 17 stickers at ₹10, a super sheet (₹80, ₹65 each for 11+), a poster (A4 ₹60, A3 ₹100, A4 framed ₹200, A3 framed ₹400), a music card (₹20, min 5), wall cards (₹30, ₹25 for 6+, ₹20 for 11+), the buy-4-get-1 sticker and buy-5-get-1 poster offers, and free shipping above ₹250.
3. **Authentication → Users → Add user**: one per admin with an email and a strong password. Only emails in `ADMIN_EMAILS` can reach admin.
4. **Project settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

Security model: Row Level Security is on for every table with no policies, so the public anon key can't read or write anything. Only the Next.js server (service role key) touches the data. Customer photos sit in a private bucket.

## 2. Netlify

On the Netlify site for shop.stixnvibes.com:

1. **Site configuration → Environment variables**, scoped to **Production** only:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `ADMIN_EMAILS` = `you@example.com,partner@example.com`
   - `ADMIN_SESSION_SECRET` = 32+ random characters (`openssl rand -base64 48`)
   - `NEXT_PUBLIC_SITE_URL` = `https://shop.stixnvibes.com`
   - Optional, for InWoice: `INWOICE_SYNC_TOKEN` = 32+ random characters. InWoice sends it as `Authorization: Bearer …` to `GET /api/integrations/orders?since=<ISO time>&limit=100` and gets orders changed since then, oldest first (`next` is the cursor for the following call). Unset = the feed returns 404.
2. **Build settings**: netlify.toml sets them (build `npm run build`, publish `.next`).
3. Deploy previews and branch deploys always run in demo mode (`netlify.toml` + `next.config.ts`), so previews never touch real orders. Demo data is in memory and resets now and then.

### Upgrading an existing shop to v4

Run `supabase/migrations/0002_checkout_campaigns.sql` in **SQL Editor → New query** before the v4 code deploys. It adds the customer phone, delivery/pickup and address to orders, a private view key for order pages, and % off sales with start and end dates. Then in **Admin → Settings** add your UPI ID so order pages show a pay-by-UPI QR.

v4 takes orders through Instagram DMs instead of WhatsApp. In **Admin → Settings**, check the Instagram account (default `stixnvibes`) and rewrite the **How payment and confirmation work** note, because the saved one still says WhatsApp. Save.

### Upgrading an existing shop to v5

1. Run `supabase/migrations/0003_growth.sql` in **SQL Editor → New query** before the v5 code deploys. It adds codes, stock counts, custom requests, the Instagram username and "came from" on orders, and a bigger stats function. It is safe to run twice.
2. Optional, to get an email for every order and custom request (with the customer's designs attached):
   - Make a free account at resend.com (3,000 emails a month free). Without your own domain it can only email the address you signed up with, which is enough here.
   - **API Keys → Create**, with the "Sending access" permission only.
   - In Netlify, add to **Production** only: `RESEND_API_KEY` (the key), `NOTIFY_EMAIL` (your inbox), and later, once stixnvibes.com is verified in Resend, `MAIL_FROM` = `Stix N Vibes <shop@stixnvibes.com>`.
   - Unset = no emails; orders and requests still land in admin.
3. **Products**: put a number in **Stock** for anything you count. It goes down when you mark an order Confirmed (or Paid, Shipped, Done) and comes back if you cancel it. Blank = not counted.
4. **Codes & QR**: make a code per stall (e.g. `WORDSUP10`, "Where you hand it out" = `stall-wordsup`) and print its QR card. **Analytics** then shows visits, orders and sales per stall and per code.
5. Read **Privacy** and **Terms** on the shop and check the promises are ones you'll keep: delete unused custom requests within 12 months, reply to data requests within 7 days, and the email address shown.

### Adding reviews

Run `supabase/migrations/0005_reviews.sql` in **SQL Editor → New query**. It adds the `reviews` table and is safe to run twice. Until it's run, the shop shows no reviews and **Admin → Reviews** is empty. New reviews wait in **Reviews → Waiting** until you publish them; your reply shows under the review on the shop.

### Upgrading an existing shop to v7

1. Run `supabase/migrations/0004_v7.sql` in **SQL Editor → New query** before the v7 code deploys. It adds a cost per product, India Post tracking numbers on orders, and tables for stalls, stall sales, blog posts, the photo library and college pages. It is safe to run twice. Until it's run, the new pages show empty and stall sales can't sync.
2. **Settings → Unit costs and profit goal**: check what each thing costs you to make (sticker ₹5, poster ₹25, A3 poster ₹50, A4 framed ₹150, A3 framed ₹320, music card ₹4, wall card ₹10 are filled in) and the goal (₹3,00,000 by 31 Dec). A product's own cost, on its edit page, wins over these. The dashboard then shows profit against the goal.
3. **Stalls**: add each pop-up with its date, venue, fee and other costs. After the day it shows takings, cash vs UPI, best sellers and profit.
4. **Stall mode** (`/admin/stall`, on your phone): open it once with signal before the stall, and "Add to Home screen". It works with no signal: tap products, tap Cash or UPI, and the sale is saved on the phone. It sends the sales when signal comes back (tap the green/red button to send now). With your UPI ID in Settings, UPI shows a QR with the amount; otherwise use the printed QR. Admin logins last 12 hours, so log in again on the morning of the stall.
5. **Packing**: paid delivery orders wait here. Paste the India Post number on the order (or in Packing), press **Save & mark shipped**, and copy the message for the customer. Their order page shows the number and a link to India Post tracking.
6. **Blog**, **Library** and **Colleges** are in the admin menu. A college page lives at `/c/<name>` with its code, its upcoming public stalls, best sellers from its stalls and its photos. Print its QR card from the college page.
7. **Instagram shop**: in Meta Commerce Manager, **Catalogue → Data sources → Data feed → Scheduled feed**, URL `https://shop.stixnvibes.com/api/feeds/catalog`, daily. Products with a price and a photo are listed; product links carry `?src=instagram-shop` so Analytics shows those sales.
8. Optional, home lab uptime checks and nightly backups: set `BACKUP_TOKEN` in Netlify (32+ random characters) and follow [homelab/README.md](../homelab/README.md).

### Online payments (optional)

See [PAYMENTS.md](PAYMENTS.md) for YouPI PG on the home lab. Without it, set the UPI ID and the WhatsApp number in **Admin → Settings → Payments**, and order pages show the QR and a WhatsApp button.

## 3. Open the shop

1. Go to `https://shop.stixnvibes.com/admin` and log in.
2. **Products**: check the prices and upload real photos. **Offers** holds the bulk prices and free-item deals.
3. **Products → Bulk add**: upload a folder of designs into a collection in one go.
4. **Settings**: check the Instagram account and the notes. Save.
5. Place a test order from your phone and check it lands in **Orders** and on the **Dashboard**.

## Daily routine

- A customer DMs the shop on Instagram with their order and its ref (`SNV-XXXXXX`). Open **Orders**, find the ref, check the items and any photos. Only confirm orders whose DM has come in: a confirmed order becomes an invoice in InWoice.
- Move it along: Confirmed → Paid → Shipped → Done. Paid delivery orders show under **Packing**; add the India Post number when it ships.
- New designs: **Bulk add** or **Add product**. Upcoming designs: status "Coming soon".
- Custom requests come in under **Custom requests** (and by email if set up). Quote on WhatsApp or Instagram, then set it to Quoted, Won or Lost.
- Printing: **Cricut sheets** packs designs onto 6.75 × 9.25 in Print Then Cut sheets with no overlaps. Drop in files, or open it from an order or a custom request. Download each sheet as a PNG, upload it to Design Space as one image, and set its width to 6.75 in.

## Running the shop in Docker (optional)

Netlify stays the main host. The Docker setup is for running a copy on the home lab or any server, e.g. if Netlify is down.

1. `cp .env.example .env` and fill in the same values as on Netlify (Supabase keys, `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET`, optional `INWOICE_SYNC_TOKEN`).
2. `docker compose up -d --build`, then open `http://<server>:3000`.

It uses the same Supabase database as the live shop, so orders placed on it are real. The container restarts by itself after a reboot or power cut. For a demo copy with in-memory data instead, build with `docker build --build-arg SHOP_DEMO_MODE=true -t shop-demo .`.
