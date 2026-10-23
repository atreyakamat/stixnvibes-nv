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

/**
 * Buy-X-get-Y offers. Per offer, the eligible units are sorted from most to
 * least expensive and cut into groups of (buy + free); in every full group
 * the cheapest `free` units cost nothing. A unit counts toward one offer
 * only, and offers apply in their sort order.
 */
export function applyOffers(lines: PricedLine[], offers: Offer[]) {
  const units = lines.flatMap((l, li) => Array.from({ length: l.qty }, () => ({ li, type: l.type, price: l.unitPricePaise, taken: false })));
  const applied: AppliedOffer[] = [];
  const active = offers.filter((o) => o.active && o.buy > 0 && o.free > 0).sort((a, b) => a.sortOrder - b.sortOrder);

  for (const offer of active) {
    const size = offer.buy + offer.free;
    const eligible = units.filter((u) => !u.taken && (offer.productType === null || u.type === offer.productType)).sort((a, b) => b.price - a.price);
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
  for (const o of offers.filter((x) => x.active && x.buy > 0 && x.free > 0).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const n = lines.filter((l) => o.productType === null || l.type === o.productType).reduce((s, l) => s + l.qty, 0);
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
