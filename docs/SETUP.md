# Going live: Supabase + Netlify

About 20 minutes. Nothing here costs money on the free tiers.

## 1. Supabase (database, admin logins, photo storage)

1. Create a project at supabase.com (free tier is fine). Region: Mumbai (`ap-south-1`).
2. **SQL Editor → New query**: paste and run `supabase/migrations/0001_shop.sql`, then `supabase/seed.sql`. This creates the tables, the dashboard stats function, two storage buckets, the Lo-fi collection with 17 stickers at ₹10, a ₹65 super sheet, a poster, a music card, wall cards (coming soon) and the two offers.
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
2. **Build settings**: netlify.toml sets them (build `npm run build`, publish `.next`).
3. Deploy previews and branch deploys always run in demo mode (`netlify.toml` + `next.config.ts`), so previews never touch real orders. Demo data is in memory and resets now and then.

## 3. Open the shop

1. Go to `https://shop.stixnvibes.com/admin` and log in.
2. **Products**: set prices on the poster, music card and wall cards (and the price changes on their options: A3, framed…). Upload real photos.
3. **Products → Bulk add**: upload a folder of designs into a collection in one go.
4. **Settings**: check the WhatsApp number and the notes. Save.
5. Place a test order from your phone and check it lands in **Orders** and on the **Dashboard**.

## Daily routine

- A WhatsApp order arrives with a ref (`SNV-XXXXXX`). Open **Orders**, find the ref, check the items and any photos.
- Move it along: Confirmed → Paid → Shipped → Done. Keep the phone number, address and courier in the private note.
- New designs: **Bulk add** or **Add product**. Upcoming designs: status "Coming soon".
