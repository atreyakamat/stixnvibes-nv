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

## 3. Open the shop

1. Go to `https://shop.stixnvibes.com/admin` and log in.
2. **Products**: check the prices and upload real photos. **Offers** holds the bulk prices and free-item deals.
3. **Products → Bulk add**: upload a folder of designs into a collection in one go.
4. **Settings**: check the WhatsApp number and the notes. Save.
5. Place a test order from your phone and check it lands in **Orders** and on the **Dashboard**.

## Daily routine

- A WhatsApp order arrives with a ref (`SNV-XXXXXX`). Open **Orders**, find the ref, check the items and any photos.
- Move it along: Confirmed → Paid → Shipped → Done. Keep the phone number, address and courier in the private note.
- New designs: **Bulk add** or **Add product**. Upcoming designs: status "Coming soon".

## Running the shop in Docker (optional)

Netlify stays the main host. The Docker setup is for running a copy on the home lab or any server, e.g. if Netlify is down.

1. `cp .env.example .env` and fill in the same values as on Netlify (Supabase keys, `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET`, optional `INWOICE_SYNC_TOKEN`).
2. `docker compose up -d --build`, then open `http://<server>:3000`.

It uses the same Supabase database as the live shop, so orders placed on it are real. The container restarts by itself after a reboot or power cut. For a demo copy with in-memory data instead, build with `docker build --build-arg SHOP_DEMO_MODE=true -t shop-demo .`.
