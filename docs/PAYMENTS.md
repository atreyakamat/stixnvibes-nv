# Online payments with YouPI PG (optional)

The order page can take UPI payments through [YouPI PG](https://github.com/youpi-pg/YouPI-PG), a self-hosted UPI gateway, running on the home lab. When it's off, down or slow, customers get the UPI QR and a WhatsApp button instead, so orders never get stuck.

```
Customer taps "Pay ₹X now" ──► shop asks YouPI for a payment (4 s limit)
   │                                 │
   │  YouPI answers                  │  YouPI down / slow / not set up
   ▼                                 ▼
YouPI checkout page            UPI QR + "Download QR" + "Send screenshot on WhatsApp"
   │                                 │
   ▼                                 ▼
YouPI sees the payment          You check your bank app and mark the order Paid
(bank SMS / Gmail observer)
   │
   ▼
Signed webhook ──► shop marks the order Paid, takes stock, emails you
```

## Read this first

- YouPI calls itself an **experimental research project**, not an approved payment gateway. Its own guideline is **20 payments a day at most** per receiving account, and it says never to treat it as the only proof of payment. Check the UTR in your bank app before shipping.
- It confirms payments by reading your bank's SMS or emails. You set that up on your phone or Gmail yourself.
- Customer sign-in uses WhatsApp OTP through an unofficial WhatsApp client. Pair a **spare number**, not your main one, because WhatsApp can ban numbers that do this.
- Customers' phones must reach the YouPI checkout page, so that page has to be public (step 3). Everything else on the home lab stays private.

## 1. The shop (always works, even without YouPI)

In **Admin → Settings → Payments**:

- **UPI ID**: the QR on order pages.
- **WhatsApp number for payment screenshots**: the fallback button opens WhatsApp to this number with the order ref filled in.

Customers can also download the QR and a receipt (**Download receipt** on the order page, saved as PDF).

## 2. YouPI on the home lab

Follow YouPI's `docs/DEPLOYMENT.md`. In short:

1. `git clone https://github.com/youpi-pg/YouPI-PG && cd YouPI-PG && cp .env.example .env`
2. In `.env`, set `ENCRYPTION_MASTER_KEY`, `JWT_SECRET`, the admin email and password, and `BASE_CHECKOUT_URL` / `BASE_PAYMENT_API_URL` = `https://pay.stixnvibes.com`. Generate the secrets yourself and keep them on the home lab only.
3. `npm install && npm run db:setup && npm run start` (or its `docker compose up -d`).
4. Open the merchant admin at `http://<homelab>:6001` (home network only):
   - **Receiving Accounts**: your UPI ID and name.
   - **Merchant**: set the webhook URL to `https://shop.stixnvibes.com/api/payments/youpi`, and copy the merchant ID and webhook secret.
   - **WhatsApp pairing**: pair the spare number.
5. Set up one observer (YouPI `docs/OBSERVERS_SETUP.md`): the Android app on the phone that gets your bank SMS, or the Gmail observer.

## 3. A public address for the checkout page

Customers need `https://pay.stixnvibes.com` to reach the YouPI **checkout portal (port 7000) only**. With a free Cloudflare Tunnel no router ports are opened:

1. stixnvibes.com's DNS must be on Cloudflare (free plan).
2. On the home lab: install `cloudflared`, run `cloudflared tunnel login`, then `cloudflared tunnel create youpi`.
3. Route only the checkout portal: in the tunnel config, `hostname: pay.stixnvibes.com` → `service: http://localhost:7000`, followed by a catch-all `service: http_status:404`.
4. `cloudflared tunnel route dns youpi pay.stixnvibes.com`, then run it as a service.

The checkout portal also passes `/api/*` through to YouPI's payment API, so YouPI's own logins guard those endpoints. Use a long admin password and keep YouPI updated.

**Never** tunnel 6001 (merchant admin), 8090 (control center), InWoice or anything else. Before switching the shop on, check from mobile data (not home Wi-Fi) that `https://pay.stixnvibes.com/youpi.js` loads and `https://pay.stixnvibes.com:6001` does not.

## 4. Switch it on in the shop

In Netlify → **Site configuration → Environment variables**, scope **Production** only:

| Variable | Value |
| --- | --- |
| `YOUPI_URL` | `https://pay.stixnvibes.com` |
| `YOUPI_MERCHANT_ID` | merchant ID from YouPI admin |
| `YOUPI_WEBHOOK_SECRET` | webhook secret from YouPI admin |

Redeploy. Order pages then show **Pay ₹X now** for orders whose total is final (stall pickups, and deliveries above the free-shipping line). Other deliveries wait until you've agreed the delivery charge, as before.

To switch it off, delete `YOUPI_URL` and redeploy. The QR + WhatsApp fallback carries on.

## 5. Test before real customers

1. Place a ₹10 pickup order on the live shop and pay it through YouPI.
2. Check the order turns **Paid** in admin with the UTR in the note, and that you got the email (if Resend is set up).
3. Match the UTR in your bank app.
4. Turn YouPI off (stop it on the home lab) and place another order: **Pay now** should fall back to the QR within about 4 seconds.

## How the shop protects itself

- It only sends customers to the `YOUPI_URL` address, never to a link from elsewhere.
- Webhooks must carry a valid HMAC signature. The timestamped one is preferred, and is refused when it is more than 15 minutes old.
- An order is marked paid only for a successful **UPI** payment of **exactly** the order total, on an order still waiting for payment. Anything else (a wrong amount, a second payment) is left alone and emailed to you to check.
- Retried webhooks don't move stock twice.
