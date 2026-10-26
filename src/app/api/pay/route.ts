import { z } from "zod";
import { site } from "@/content/site";
import { json, readJson } from "@/lib/api";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { storeMode, youpiConfig } from "@/lib/env";
import { awaitingPayment, orderPath, totalIsFinal, viewKeyMatches } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { startPayment } from "@/lib/youpi";

const bodySchema = z.object({ number: z.string().toUpperCase().regex(ORDER_NUMBER_RE), key: z.string().min(1).max(100) });

// "Pay now" on the order page. Answers { url } to send the customer to the
// gateway, or { fallback: true } so the page shows the UPI QR instead.
export async function POST(req: Request) {
  if (!(await rateLimit("pay", 20, 10 * 60_000))) return json({ fallback: true, error: "Too many tries. Pay with the QR below." }, 429);
  const parsed = bodySchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const store = getStoreOrNull();
  const order = store ? await store.getOrder(parsed.data.number).catch(() => null) : null;
  // Same answer for a wrong key and a missing order.
  if (!store || !order || !viewKeyMatches(order, parsed.data.key)) return json({ error: "Order not found." }, 404);
  if (!awaitingPayment(order)) return json({ error: "This order doesn't need paying." }, 409);
  const settings = await store.getSettings();
  if (!totalIsFinal(order, settings.freeShippingAbovePaise)) return json({ error: "We'll confirm the delivery charge first." }, 409);

  const cfg = youpiConfig();
  if (!cfg) return json({ fallback: true }, 503);
  const started = await startPayment(cfg, {
    orderNumber: order.number,
    amountPaise: order.totalPaise,
    // Previews run on their own address; the live shop always uses its own domain.
    returnUrl: `${storeMode() === "demo" ? new URL(req.url).origin : site.url}${orderPath(order)}&paid=1`,
    customer: { name: order.customerName, phone: order.customerPhone },
  });
  if (!started) {
    console.warn(`[pay] YouPI unavailable for ${order.number}; showing the QR instead`);
    return json({ fallback: true }, 503);
  }
  return json({ url: started.checkoutUrl });
}
