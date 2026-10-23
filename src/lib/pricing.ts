import { formatINR } from "./money";
import type { AppliedOffer, Offer, Product, ProductType } from "./types";

// Pricing rules shared by the browser (cart totals) and the server (the
// order record). Pure functions, no I/O.

/** Picked option value per option group: { [groupId]: valueId }. */
export type Selections = Record<string, string>;

export function defaultSelections(product: Pick<Product, "options">): Selections {
  const out: Selections = {};
  for (const g of product.options) if (g.values[0]) out[g.id] = g.values[0].id;
  return out;
}

/**
 * Resolves picked options to labels and the price change they add. Groups
 * the customer didn't touch fall back to their first value. Returns null
 * when a picked value doesn't exist (the product changed under the cart).
 */
export function resolveOptions(product: Pick<Product, "options">, selections: Selections) {
  const labels: string[] = [];
  const resolved: Selections = {};
  let deltaPaise = 0;
  for (const g of product.options) {
    if (!g.values.length) continue;
    const id = selections[g.id] ?? g.values[0].id;
    const v = g.values.find((x) => x.id === id);
    if (!v) return null;
    resolved[g.id] = v.id;
    labels.push(`${g.name}: ${v.label}`);
    deltaPaise += v.priceDeltaPaise;
  }
  return { labels, deltaPaise, selections: resolved };
}

export function unitPrice(product: Pick<Product, "options" | "pricePaise">, selections: Selections): number | null {
  if (product.pricePaise === null) return null;
  const r = resolveOptions(product, selections);
  return r ? Math.max(0, product.pricePaise + r.deltaPaise) : null;
}

/** Lowest price a customer can pay for this product, for "From ₹x" labels. */
export function fromPrice(product: Pick<Product, "options" | "pricePaise">): number | null {
  if (product.pricePaise === null) return null;
  let p = product.pricePaise;
  for (const g of product.options) if (g.values.length) p += Math.min(...g.values.map((v) => v.priceDeltaPaise));
  return Math.max(0, p);
}

export function hasPriceRange(product: Pick<Product, "options">): boolean {
  return product.options.some((g) => new Set(g.values.map((v) => v.priceDeltaPaise)).size > 1);
}

export function canOrder(product: Pick<Product, "status" | "soldOut" | "pricePaise">): boolean {
  return product.status === "live" && !product.soldOut && product.pricePaise !== null;
}

export type PricedLine = { type: ProductType; unitPricePaise: number; qty: number };

const validOffer = (o: Offer) =>
  o.active && o.buy > 0 && (o.kind === "volume" ? o.pricePaise !== null && o.pricePaise >= 0 : o.free > 0);
const matches = (o: Offer, type: ProductType) => o.productType === null || o.productType === type;

/** The volume tier that applies to `n` items, if any: the lowest price reached. */
function volumeTier(offers: Offer[], n: number) {
  return offers.filter((o) => o.buy <= n).sort((a, b) => a.pricePaise! - b.pricePaise!)[0] ?? null;
}

/**
 * Applies offers in two passes.
 *
 * 1. Volume pricing: for each product type with volume tiers, once the cart
 *    holds `buy` or more of that type, every unit costs the tier price
 *    (6+ wall cards at ₹25, 11+ at ₹20).
 * 2. Buy-X-get-Y: per offer, the eligible units are sorted from most to
 *    least expensive and cut into groups of (buy + free); in every full
 *    group the cheapest `free` units cost nothing. A unit counts toward one
 *    offer only, and offers apply in their sort order.
 */
export function applyOffers(lines: PricedLine[], offers: Offer[]) {
  const active = offers.filter(validOffer).sort((a, b) => a.sortOrder - b.sortOrder);
  const applied: AppliedOffer[] = [];
  const prices = lines.map((l) => l.unitPricePaise);

  const volume = active.filter((o) => o.kind === "volume");
  for (const scope of new Set(volume.map((o) => o.productType))) {
    const tiers = volume.filter((o) => o.productType === scope);
    const idx = lines.map((l, i) => (scope === null || l.type === scope ? i : -1)).filter((i) => i >= 0);
    const tier = volumeTier(tiers, idx.reduce((n, i) => n + lines[i].qty, 0));
    if (!tier) continue;
    let discount = 0;
    for (const i of idx) {
      const cut = Math.max(0, prices[i] - tier.pricePaise!);
      discount += cut * lines[i].qty;
      prices[i] -= cut;
    }
    if (discount > 0) applied.push({ offerId: tier.id, name: tier.name, freeUnits: 0, discountPaise: discount });
  }

  const units = lines.flatMap((l, li) => Array.from({ length: l.qty }, () => ({ type: l.type, price: prices[li], taken: false })));
  for (const offer of active.filter((o) => o.kind !== "volume")) {
    const size = offer.buy + offer.free;
    const eligible = units.filter((u) => !u.taken && matches(offer, u.type)).sort((a, b) => b.price - a.price);
    const groups = Math.floor(eligible.length / size);
    if (!groups) continue;
    let discount = 0;
    for (let g = 0; g < groups; g++) {
      const chunk = eligible.slice(g * size, (g + 1) * size);
      chunk.forEach((u) => (u.taken = true));
      for (const u of chunk.slice(offer.buy)) discount += u.price;
    }
    applied.push({ offerId: offer.id, name: offer.name, freeUnits: groups * offer.free, discountPaise: discount });
  }
  const discountPaise = applied.reduce((n, a) => n + a.discountPaise, 0);
  return { applied, discountPaise };
}

export function totals(lines: PricedLine[], offers: Offer[]) {
  const subtotalPaise = lines.reduce((n, l) => n + l.unitPricePaise * l.qty, 0);
  const { applied, discountPaise } = applyOffers(lines, offers);
  return { subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise, applied };
}

/** "Add 1 more sticker and it's free" nudges for the cart. */
export function offerHints(lines: PricedLine[], offers: Offer[], label: (type: ProductType | null, n: number) => string): string[] {
  const hints: string[] = [];
  const active = offers.filter(validOffer).sort((a, b) => a.sortOrder - b.sortOrder);
  const count = (o: Offer) => lines.filter((l) => matches(o, l.type)).reduce((s, l) => s + l.qty, 0);

  const volume = active.filter((o) => o.kind === "volume");
  for (const scope of new Set(volume.map((o) => o.productType))) {
    const tiers = volume.filter((o) => o.productType === scope).sort((a, b) => a.buy - b.buy);
    const n = count(tiers[0]);
    const current = volumeTier(tiers, n);
    const next = tiers.find((t) => t.buy > n && (!current || t.pricePaise! < current.pricePaise!));
    if (n === 0 || !next) continue;
    const need = next.buy - n;
    hints.push(`Add ${need} more ${label(scope, need)} to pay ${formatINR(next.pricePaise!)} each.`);
  }

  for (const o of active.filter((x) => x.kind !== "volume")) {
    const n = count(o);
    if (n === 0) continue;
    const size = o.buy + o.free;
    const inGroup = n % size;
    if (inGroup === 0) continue;
    const need = size - inGroup;
    hints.push(
      need <= o.free
        ? `Add ${need} more ${label(o.productType, need)} and ${need === 1 ? "it's" : "they're"} free (${o.name}).`
        : `Add ${need - o.free} more ${label(o.productType, need - o.free)} to unlock ${o.name}.`,
    );
  }
  return hints;
}

/** Products whose minimum order isn't met yet, e.g. music cards (min 5). */
export function minQtyShortfalls(lines: { productId: string; qty: number }[], products: { id: string; name: string; minQty: number }[]) {
  const qty = new Map<string, number>();
  for (const l of lines) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.qty);
  return products
    .filter((p) => qty.has(p.id) && qty.get(p.id)! < p.minQty)
    .map((p) => ({ productId: p.id, name: p.name, minQty: p.minQty, need: p.minQty - qty.get(p.id)! }));
}

/** Free shipping nudge; null when there's no threshold. */
export function shippingStatus(totalPaise: number, freeAbovePaise: number | null) {
  if (freeAbovePaise === null) return null;
  return totalPaise >= freeAbovePaise ? { free: true, needPaise: 0 } : { free: false, needPaise: freeAbovePaise - totalPaise };
}
