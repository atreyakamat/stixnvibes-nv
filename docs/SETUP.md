# Going live: Supabase + Netlify

About 20 minutes. Nothing here costs money on the free tiers.

## 1. Supabase (database, admin logins, photo storage)

1. Create a project at supabase.com (free tier is fine). Region: Mumbai (`ap-south-1`).
2. **SQL Editor → New query**: paste and run `supabase/migrations/0001_shop.sql`, then `supabase/seed.sql`. This creates the tables, the stock-safe order function, the two storage buckets and the 18 starter products (no prices yet).
3. **Authentication → Users → Add user**: one per admin (you, Kritik) with an email and a strong password. Turn off public sign-ups under **Authentication → Providers → Email** if you like; only emails in `ADMIN_EMAILS` can reach admin anyway.
4. **Project settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

Security model: Row Level Security is on for every table with no policies, so the public anon key can't read or write anything. Only the Next.js server (service role key) touches the data.

## 2. Netlify

On the Netlify site for shop.stixnvibes.com (or a new site linked to this repo):

1. **Site configuration → Environment variables**, scoped to **Production** only:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `ADMIN_EMAILS` = `you@example.com,kritik@example.com`
   - `ADMIN_SESSION_SECRET` = 32+ random characters (`openssl rand -base64 48`)
   - `NEXT_PUBLIC_SITE_URL` = `https://shop.stixnvibes.com`
2. **Build settings**: base directory empty, build command `npm run build`, publish `.next` (netlify.toml sets these).
3. Deploy previews and branch deploys always run in demo mode (set in `netlify.toml`), so previews never touch real orders.

## 3. Open the shop

1. Go to `https://shop.stixnvibes.com/admin` and log in.
2. **Products**: set a price on each option. Add stock if you want limits; leave blank for made-to-order. Upload photos.
3. **Settings**: add your UPI ID and payee name, shipping fee, free-shipping threshold, where you ship, pickup details. Tick **Take online orders**. Save.
4. Place a ₹1 test order with a real UPI payment, check it shows in "Payments to check", mark it paid, then cancel it.

## Daily routine

- Dashboard → **Payments to check**: match amount + UTR in your bank app → Mark paid.
- **Paid, to pack** → pack → Mark packed → add courier + tracking → Mark shipped.
- Use **WhatsApp customer** on any order to send a ready-written update.
