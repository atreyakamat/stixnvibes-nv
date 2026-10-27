import { z } from "zod";
import { totals, type PricedLine } from "./pricing";
import { PAYMENTS, PRODUCT_TYPE_IDS, type Offer, type ProductType, type StallSale, type StallSaleLine } from "./types";

// Stall mode: sales rung up on the phone at a pop-up, often with no signal.
// The phone keeps a queue and sends it here when it can. Shared by the
// stall screen (browser) and the sync route (server).

export const SALE_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
export const MAX_SALES_PER_SYNC = 200;

/** One thing in the stall cart. productId "" = a one-off item typed in. */
export type StallCartLine = {
  key: string;
  productId: string;
  name: string;
  type: ProductType | "other";
  options: string[];
  unitPricePaise: number;
  qty: number;
};

/**
 * Prices the stall cart: the shop's offers (buy 4 get 1 and the rest) when
 * applyOffers is on, then a discount typed at the stall. One-off items
 * aren't counted for offers.
 */
export function priceStallCart(lines: StallCartLine[], offers: Offer[], opts: { applyOffers: boolean; extraDiscountPaise: number }) {
  const priced: PricedLine[] = lines.filter((l) => l.type !== "other").map((l) => ({ type: l.type as ProductType, unitPricePaise: l.unitPricePaise, qty: l.qty }));
  const subtotalPaise = lines.reduce((n, l) => n + l.unitPricePaise * l.qty, 0);
  const offerDiscount = opts.applyOffers ? totals(priced, offers).discountPaise : 0;
  const discountPaise = Math.min(subtotalPaise, offerDiscount + Math.max(0, Math.round(opts.extraDiscountPaise)));
  return { subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise, offerDiscountPaise: offerDiscount };
}

export function saleLines(lines: StallCartLine[]): StallSaleLine[] {
  return lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    type: l.type,
    options: l.options,
    qty: l.qty,
    unitPricePaise: l.unitPricePaise,
    lineTotalPaise: l.unitPricePaise * l.qty,
  }));
}

/** A random id for a new sale, made on the phone. */
export function newSaleId(): string {
  return `s-${crypto.randomUUID()}`;
}

const lineSchema = z.object({
  productId: z.string().max(64),
  name: z.string().trim().min(1).max(120),
  type: z.enum([...PRODUCT_TYPE_IDS, "other"]),
  options: z.array(z.string().max(120)).max(10),
  qty: z.number().int().min(1).max(999),
  unitPricePaise: z.number().int().min(0).max(10_000_000),
  lineTotalPaise: z.number().int().min(0).max(1_000_000_000),
});

export const saleSchema = z
  .object({
    id: z.string().regex(SALE_ID_RE),
    stallId: z.string().max(64).nullable(),
    lines: z.array(lineSchema).min(1).max(100),
    subtotalPaise: z.number().int().min(0),
    discountPaise: z.number().int().min(0),
    totalPaise: z.number().int().min(0),
    payment: z.enum(PAYMENTS),
    note: z.string().trim().max(300).default(""),
    soldAt: z.string().max(40),
  })
  .refine((x) => x.lines.every((l) => l.lineTotalPaise === l.unitPricePaise * l.qty), "A line total doesn't match its price × quantity.")
  .refine((x) => x.subtotalPaise === x.lines.reduce((n, l) => n + l.lineTotalPaise, 0), "The subtotal doesn't add up.")
  .refine((x) => x.discountPaise <= x.subtotalPaise && x.totalPaise === x.subtotalPaise - x.discountPaise, "The total doesn't add up.");

export const syncSchema = z.object({ sales: z.array(z.unknown()).min(1).max(MAX_SALES_PER_SYNC) });

/**
 * Why a sale can't be stored, or null. The phone's clock decides soldAt;
 * it has to be a real time in the last 120 days and not in the future.
 */
export function saleTimeProblem(soldAt: string, now = Date.now()): string | null {
  const t = Date.parse(soldAt);
  if (Number.isNaN(t)) return "The sale time isn't a date.";
  if (t > now + 36 * 3_600_000) return "The sale time is in the future. Check the phone's clock.";
  if (t < now - 120 * 86_400_000) return "The sale is more than 120 days old.";
  return null;
}

/** retry: false means the sale itself is wrong and sending it again won't help. */
export type SyncResult = { id: string; ok: true; created: boolean } | { id: string; ok: false; error: string; retry: boolean };

/** Sales total per payment kind. */
export function tally(sales: Pick<StallSale, "payment" | "totalPaise">[]) {
  const cash = sales.filter((x) => x.payment === "cash").reduce((n, x) => n + x.totalPaise, 0);
  const upi = sales.filter((x) => x.payment === "upi").reduce((n, x) => n + x.totalPaise, 0);
  return { cash, upi, total: cash + upi, count: sales.length };
}
