import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// YouPI PG client: starts a payment and checks the webhooks it sends back.
// Contract: github.com/youpi-pg/YouPI-PG (openapi.yaml, docs/MERCHANT_INTEGRATION.md).
// YouPI runs on the home lab, which can be off (power cuts), so every call
// has a short timeout and the order page falls back to the UPI QR.

export type YoupiConfig = { origin: string; merchantId: string; webhookSecret: string };

/** How long the customer waits for the gateway before getting the QR instead. */
export const CREATE_TIMEOUT_MS = 4000;

const createResponse = z.object({ paymentId: z.string().min(1), checkoutUrl: z.string().min(1) });

export type StartPayment = {
  orderNumber: string;
  amountPaise: number;
  returnUrl: string;
  customer: { name: string; phone: string };
};

/**
 * Asks YouPI for a payment session. Returns the checkout link, or null when
 * the gateway is down, slow or answers with something unexpected.
 */
export async function startPayment(cfg: YoupiConfig, p: StartPayment, fetchImpl: typeof fetch = fetch): Promise<{ checkoutUrl: string; paymentId: string } | null> {
  try {
    const res = await fetchImpl(`${cfg.origin}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merchant-Id": cfg.merchantId,
        // Same order and amount = same session, so a double tap doesn't make two.
        "Idempotency-Key": `${p.orderNumber}-${p.amountPaise}`,
      },
      body: JSON.stringify({
        orderId: p.orderNumber,
        amount: (p.amountPaise / 100).toFixed(2),
        currency: "INR",
        description: `Stix N Vibes ${p.orderNumber}`,
        returnUrl: p.returnUrl,
        customer: { name: p.customer.name, phoneNumber: p.customer.phone },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = createResponse.safeParse(await res.json());
    if (!body.success) return null;
    // Only ever send the customer to our own gateway.
    const url = new URL(body.data.checkoutUrl, cfg.origin);
    if (url.origin !== cfg.origin) return null;
    return { checkoutUrl: url.toString(), paymentId: body.data.paymentId };
  } catch {
    return null;
  }
}

const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data, "utf8").digest("hex");

function sameHex(expected: string, header: string | null): boolean {
  const got = (header ?? "").replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/i.test(got)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(got.toLowerCase(), "hex"));
}

/** Webhooks older than this are refused, so a captured one can't be replayed later. */
export const WEBHOOK_MAX_AGE_MS = 15 * 60_000;

/**
 * Checks a webhook's signature. Uses the timestamped V2 signature, which
 * also proves the webhook is fresh, and only accepts the plain one when V2
 * is missing.
 */
export function webhookIsGenuine(secret: string, rawBody: string, headers: Headers, now = Date.now()): boolean {
  const ts = headers.get("x-gateway-timestamp");
  const v2 = headers.get("x-gateway-signature-v2");
  if (v2 !== null) {
    if (!ts || !/^\d{10,16}$/.test(ts) || Math.abs(now - Number(ts)) > WEBHOOK_MAX_AGE_MS) return false;
    return sameHex(hmac(secret, `${ts}.${rawBody}`), v2);
  }
  return sameHex(hmac(secret, rawBody), headers.get("x-gateway-signature"));
}

export const webhookSchema = z.object({
  event: z.enum(["SUCCESS", "FAILED", "EXPIRED", "CANCELLED"]),
  paymentId: z.string().max(100),
  orderId: z.string().max(40),
  amountPaise: z.number().int().nonnegative(),
  currency: z.string().default("INR"),
  method: z.string().default("UPI"),
  utr: z.string().max(40).default(""),
});

export type YoupiWebhook = z.infer<typeof webhookSchema>;
