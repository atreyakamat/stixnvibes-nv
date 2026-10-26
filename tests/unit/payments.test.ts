import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { priceLines, totalIsFinal } from "@/lib/orders";
import { applyYoupiWebhook } from "@/lib/payments";
import { getStore } from "@/lib/store";
import { seedOffers } from "@/lib/store/seed";
import { startPayment, webhookIsGenuine, webhookSchema, type YoupiWebhook } from "@/lib/youpi";

const cfg = { origin: "https://pay.stixnvibes.com", merchantId: "m-1", webhookSecret: "s".repeat(32) };
const sign = (data: string) => `sha256=${createHmac("sha256", cfg.webhookSecret).update(data).digest("hex")}`;

describe("starting a YouPI payment", () => {
  const start = { orderNumber: "SNV-ABCDEF", amountPaise: 12050, returnUrl: "https://shop.stixnvibes.com/order/SNV-ABCDEF?k=x&paid=1", customer: { name: "Meera", phone: "9876543210" } };

  it("sends the order and amount in rupees, and returns the gateway's checkout link", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ paymentId: "p1", checkoutUrl: "https://pay.stixnvibes.com/checkout/p1" }, { status: 201 }));
    const r = await startPayment(cfg, start, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ paymentId: "p1", checkoutUrl: "https://pay.stixnvibes.com/checkout/p1" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://pay.stixnvibes.com/api/v1/payments");
    expect(JSON.parse(String(init.body))).toMatchObject({ orderId: "SNV-ABCDEF", amount: "120.50", currency: "INR" });
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("SNV-ABCDEF-12050");
  });

  it("returns null (QR fallback) when the gateway is down, errors or points elsewhere", async () => {
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await startPayment(cfg, start, down as unknown as typeof fetch)).toBeNull();
    const error = vi.fn(async () => Response.json({ error: "busy" }, { status: 503 }));
    expect(await startPayment(cfg, start, error as unknown as typeof fetch)).toBeNull();
    const elsewhere = vi.fn(async () => Response.json({ paymentId: "p1", checkoutUrl: "https://evil.example/checkout/p1" }));
    expect(await startPayment(cfg, start, elsewhere as unknown as typeof fetch)).toBeNull();
  });
});

describe("YouPI webhooks", () => {
  const body = JSON.stringify({ event: "SUCCESS", paymentId: "p1", orderId: "SNV-ABCDEF", amountPaise: 1000 });
  const now = 1_790_000_000_000;

  it("accepts a fresh V2 signature and refuses an old or forged one", () => {
    const ts = String(now);
    const ok = new Headers({ "x-gateway-timestamp": ts, "x-gateway-signature-v2": sign(`${ts}.${body}`) });
    expect(webhookIsGenuine(cfg.webhookSecret, body, ok, now)).toBe(true);
    expect(webhookIsGenuine(cfg.webhookSecret, body, ok, now + 16 * 60_000)).toBe(false);
    expect(webhookIsGenuine(cfg.webhookSecret, body.replace("1000", "1"), ok, now)).toBe(false);
    expect(webhookIsGenuine("x".repeat(32), body, ok, now)).toBe(false);
    // A V2 header that fails isn't rescued by a valid V1 one.
    const mixed = new Headers({ "x-gateway-timestamp": ts, "x-gateway-signature-v2": "sha256=00", "x-gateway-signature": sign(body) });
    expect(webhookIsGenuine(cfg.webhookSecret, body, mixed, now)).toBe(false);
  });

  it("falls back to the V1 signature when V2 is missing", () => {
    expect(webhookIsGenuine(cfg.webhookSecret, body, new Headers({ "x-gateway-signature": sign(body) }), now)).toBe(true);
    expect(webhookIsGenuine(cfg.webhookSecret, body, new Headers({}), now)).toBe(false);
  });
});

describe("applying a payment", () => {
  async function order(number: string, totalPaise = 3000) {
    const store = getStore();
    const lines = priceLines([{ productId: "p-lofi-03", qty: 3, selections: {}, custom: {} }], await store.listProducts(), seedOffers()).lines;
    await store.createOrder({
      number,
      viewKey: "k".repeat(22),
      customerName: "A",
      customerPhone: "9876543210",
      fulfilment: "pickup",
      address: { line: "", city: "", state: "", pincode: "" },
      customerNote: "",
      lines,
      subtotalPaise: totalPaise,
      discountPaise: 0,
      totalPaise,
      offers: [],
      couponCode: "",
      source: "",
      instagram: "",
    });
  }
  const event = (over: Partial<YoupiWebhook>) => webhookSchema.parse({ event: "SUCCESS", paymentId: "pay-1", orderId: "SNV-PAY001", amountPaise: 3000, utr: "123456789012", ...over });

  it("marks the order paid, takes stock once and records the UTR", async () => {
    await order("SNV-PAY001");
    const stock = async () => (await getStore().getProduct("p-lofi-03"))!.stock;
    const before = await stock();
    expect(await applyYoupiWebhook(event({}))).toBe("paid");
    const o = (await getStore().getOrder("SNV-PAY001"))!;
    expect(o.status).toBe("paid");
    expect(o.adminNote).toMatch(/UTR 123456789012, payment pay-1/);
    expect(await stock()).toBe(before! - 3);
    // The same webhook again (a retry) changes nothing.
    expect(await applyYoupiWebhook(event({}))).toBe("already-paid");
    expect(await stock()).toBe(before! - 3);
  });

  it("leaves the order alone when the amount is wrong or the payment failed", async () => {
    await order("SNV-PAY002");
    expect(await applyYoupiWebhook(event({ orderId: "SNV-PAY002", amountPaise: 100 }))).toBe("mismatch");
    expect(await applyYoupiWebhook(event({ orderId: "SNV-PAY002", event: "FAILED" }))).toBe("ignored");
    expect(await applyYoupiWebhook(event({ orderId: "SNV-PAY002", method: "COD" }))).toBe("mismatch");
    expect((await getStore().getOrder("SNV-PAY002"))!.status).toBe("new");
    expect(await applyYoupiWebhook(event({ orderId: "SNV-NOPE00" }))).toBe("unknown-order");
  });

  it("only lets final totals be paid online", () => {
    expect(totalIsFinal({ fulfilment: "pickup", totalPaise: 1000 }, 25000)).toBe(true);
    expect(totalIsFinal({ fulfilment: "delivery", totalPaise: 1000 }, 25000)).toBe(false);
    expect(totalIsFinal({ fulfilment: "delivery", totalPaise: 30000 }, 25000)).toBe(true);
    expect(totalIsFinal({ fulfilment: "delivery", totalPaise: 30000 }, null)).toBe(false);
  });
});
