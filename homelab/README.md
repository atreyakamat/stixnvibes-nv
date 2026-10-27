# Home lab: uptime checks and shop backups

Two small containers for the home server. They're separate from the shop
itself, which keeps running on Netlify and Supabase.

- **Uptime Kuma** checks every service once a minute and messages you when one goes down.
- **backup** downloads a full copy of the shop's data every night at 03:00 and keeps 30 days of copies.

Both are free and need no account anywhere.

## Set up

1. On Netlify, add the env var `BACKUP_TOKEN` to the shop. Use 32+ random characters (`openssl rand -base64 48`), then redeploy.
2. On the home server:
   ```sh
   cd homelab
   cp .env.example .env    # put the same BACKUP_TOKEN in here
   docker compose up -d --build
   ```
3. Test a backup straight away:
   ```sh
   docker compose exec backup backup.sh
   ls data/backups         # 2026-10-27.json.gz
   ```
4. Open `http://<server>:3001`, make the Uptime Kuma login, and add the monitors below.

## Monitors to add in Uptime Kuma

| Name | Type | Address | Notes |
| --- | --- | --- | --- |
| Shop | HTTP(s) - Keyword | `https://shop.stixnvibes.com/api/health` | Keyword `"ok":true`. Goes red if the shop can't reach its database. |
| Main site | HTTP(s) | `https://www.stixnvibes.com` | |
| Shop home page | HTTP(s) | `https://shop.stixnvibes.com` | Catches a broken deploy. |
| YouPI | HTTP(s) | your YouPI address | Online UPI payments. |
| InWoice | HTTP(s) | your InWoice address | |
| Nightly backup | Push | (Uptime Kuma gives you the URL) | Heartbeat interval 90000 seconds (25 h). Put the push URL in `BACKUP_PUSH_URL` in `.env`, then `docker compose up -d`. If a night's backup fails or doesn't run, this goes red. |

For alerts, go to Settings > Notifications. Telegram (make a bot with @BotFather)
or ntfy (the free ntfy.sh app) both work on a phone and cost nothing.

From inside Docker, the push URL can use `http://uptime-kuma:3001/...`, since
both containers share a network.

## What a backup holds

One gzipped JSON file per day in `data/backups/`. It has products, collections,
offers, coupons, orders, custom requests, settings, stalls, stall sales,
blog posts, the photo library and college pages. Analytics events are left
out.

Photos stay in Supabase Storage; the backup has their links. Set
`BACKUP_IMAGES=1` to also download every photo into `data/backups/images/`
(only new ones each night).

To read one:

```sh
gunzip -c data/backups/2026-10-27.json.gz | jq '.data.orders | length'
```

Copies older than `KEEP_DAYS` (30) are deleted automatically. For a second
copy off the server, point any sync tool you already use at `data/backups/`.

## Restoring

The file is a plain dump of each table, so rows can go back in with the
Supabase table editor (import CSV/JSON) or a short script. Restore into a
fresh project first and check it before touching the live one.
