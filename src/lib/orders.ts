import "server-only";
import { randomInt } from "node:crypto";
import { site } from "@/content/site";
import { UPLOAD_ID_RE } from "@/lib/constants";
import { canOrder, minQtyShortfalls, resolveOptions, totals } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import type { Offer, Order, OrderLine, Product } from "@/lib/types";
import type { OrderInput } from "@/lib/validation";
import { orderMessage, waLink } from "@/lib/whatsapp";

export class OrderError extends Error {
  constructor(message: string, public problems: { productId: string; reason: string }[] = []) {
    super(message);
  }
}

// Order refs avoid 0/O and 1/I so they're easy to read out on a call.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function orderNumber(): string {
  let s = "SNV-";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export const uploadUrl = (id: string) => `${site.url}/u/${id}`;

/**
 * Prices the cart from the live catalog. The browser only sends ids,
 * picked options and typed text; prices always come from here.
 */
export function priceLines(input: OrderInput["lines"], products: Product[], offers: Offer[]) {
  const problems: { productId: string; reason: string }[] = [];
  const lines: OrderLine[] = [];

  for (const l of input) {
    const p = products.find((x) => x.id === l.productId);
    if (!p || !canOrder(p)) {
      problems.push({ productId: l.productId, reason: p ? `${p.name} can't be ordered right now.` : "An item in your cart is no longer available." });
      continue;
    }
    const opts = resolveOptions(p, l.selections);
    if (!opts) {
      problems.push({ productId: p.id, reason: `The options for ${p.name} changed. Remove it and add it again.` });
      continue;
    }
    const custom: OrderLine["custom"] = [];
    for (const f of p.customFields) {
      const value = (l.custom[f.id] ?? "").trim();
      if (!value) {
        if (f.required) problems.push({ productId: p.id, reason: `${p.name}: fill in "${f.label}".` });
        continue;
      }
      if (f.kind === "image") {
        if (!UPLOAD_ID_RE.test(value)) {
          problems.push({ productId: p.id, reason: `${p.name}: upload "${f.label}" again.` });
          continue;
        }
        custom.push({ label: f.label, value: uploadUrl(value), kind: f.kind });
      } else {
        custom.push({ label: f.label, value, kind: f.kind });
      }
    }
    const unit = Math.max(0, p.pricePaise! + opts.deltaPaise);
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type,
      image: p.images[0] ?? null,
      options: opts.labels,
      custom,
      unitPricePaise: unit,
      qty: l.qty,
      lineTotalPaise: unit * l.qty,
    });
  }

  for (const s of minQtyShortfalls(lines, products)) {
    problems.push({ productId: s.productId, reason: `${s.name}: the minimum is ${s.minQty} per order. Add ${s.need} more.` });
  }
  const t = totals(lines, offers);
  return { lines, problems, ...t };
}

/** Records the order and returns the WhatsApp link that sends it. */
export async function createOrder(input: OrderInput): Promise<{ order: Order; whatsappUrl: string }> {
  const store = getStore();
  const [products, offers, settings] = await Promise.all([store.listProducts(), store.listOffers(), store.getSettings()]);
  if (!settings.storeOpen) throw new OrderError("Online orders are paused. Message us on WhatsApp.");

  const priced = priceLines(input.lines, products, offers);
  if (priced.problems.length) throw new OrderError(priced.problems[0].reason, priced.problems);

  let order: Order | null = null;
  for (let attempt = 0; attempt < 4 && !order; attempt++) {
    try {
      order = await store.createOrder({
        number: orderNumber(),
        customerName: input.customerName,
        customerNote: input.customerNote,
        lines: priced.lines,
        subtotalPaise: priced.subtotalPaise,
        discountPaise: priced.discountPaise,
        totalPaise: priced.totalPaise,
        offers: priced.applied,
      });
    } catch (err) {
      if (!/duplicate/i.test((err as Error).message) || attempt === 3) throw err;
    }
  }

  const text = orderMessage({ ...order!, freeShippingAbovePaise: settings.freeShippingAbovePaise });
  return { order: order!, whatsappUrl: waLink(settings.whatsappNumber, text) };
}
