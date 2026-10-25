import "server-only";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { site } from "@/content/site";
import { UPLOAD_ID_RE } from "@/lib/constants";
import { canOrder, liveOffers, minQtyShortfalls, resolveOptions, totals } from "@/lib/pricing";
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

/** 128-bit secret for the customer's order page link. */
export const newViewKey = () => randomBytes(16).toString("base64url");

export const orderPath = (o: Pick<Order, "number" | "viewKey">) => `/order/${o.number}?k=${o.viewKey}`;
export const orderUrl = (o: Pick<Order, "number" | "viewKey">) => `${site.url}${orderPath(o)}`;

/** Constant-time check of the key in an order page link. */
export function viewKeyMatches(order: Pick<Order, "viewKey">, key: string | undefined): boolean {
  if (!order.viewKey || !key) return false;
  const a = Buffer.from(order.viewKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The WhatsApp message for an order, with the customer's details and page link. */
export function whatsappFor(order: Order, freeShippingAbovePaise: number | null) {
  return orderMessage({ ...order, freeShippingAbovePaise, link: orderUrl(order) });
}

/** An http(s) link as typed, or null for anything else (javascript:, data:, plain text). */
export function webLink(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

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
      } else if (f.kind === "link") {
        // Shown as a clickable link in admin and in the message, so only web links.
        const url = webLink(value);
        if (!url) {
          problems.push({ productId: p.id, reason: `${p.name}: "${f.label}" needs a link starting with https://` });
          continue;
        }
        custom.push({ label: f.label, value: url, kind: f.kind });
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
  const [products, allOffers, settings] = await Promise.all([store.listProducts(), store.listOffers(), store.getSettings()]);
  if (!settings.storeOpen) throw new OrderError("Online orders are paused. Message us on WhatsApp.");

  const priced = priceLines(input.lines, products, liveOffers(allOffers));
  if (priced.problems.length) throw new OrderError(priced.problems[0].reason, priced.problems);

  let order: Order | null = null;
  for (let attempt = 0; attempt < 4 && !order; attempt++) {
    try {
      order = await store.createOrder({
        number: orderNumber(),
        viewKey: newViewKey(),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        fulfilment: input.fulfilment,
        address: input.address,
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

  return { order: order!, whatsappUrl: waLink(settings.whatsappNumber, whatsappFor(order!, settings.freeShippingAbovePaise)) };
}
