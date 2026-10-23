import { MAX_QTY_PER_LINE } from "@/lib/constants";
import type { Fulfilment, OrderItem, Product, Settings } from "@/lib/types";

export { MAX_QTY_PER_LINE };

export type CartLine = { productId: string; variantId: string; qty: number };

export type QuoteProblem = { productId: string; variantId: string; reason: string };

export type Quote = {
  items: OrderItem[];
  problems: QuoteProblem[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  /** Paise still needed to unlock free shipping, when a threshold is set. */
  toFreeShippingPaise: number | null;
  belowMinimum: boolean;
};

/**
 * Prices a cart from the catalog. The browser only ever sends ids and
 * quantities; every price here comes from the store, so a tampered cart
 * can't change what an order costs.
 */
export function quoteCart(
  lines: CartLine[],
  products: Product[],
  settings: Settings,
  fulfilment: Fulfilment,
): Quote {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: OrderItem[] = [];
  const problems: QuoteProblem[] = [];
  const merged = new Map<string, CartLine>();

  for (const line of lines) {
    const key = `${line.productId}:${line.variantId}`;
    const prev = merged.get(key);
    merged.set(key, { ...line, qty: (prev?.qty ?? 0) + line.qty });
  }

  for (const line of merged.values()) {
    const product = byId.get(line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    const problem = (reason: string) => problems.push({ productId: line.productId, variantId: line.variantId, reason });

    if (!product || !product.active || !variant || !variant.active) {
      problem("This item is no longer available.");
      continue;
    }
    if (variant.pricePaise === null) {
      problem("This item isn't on sale online yet.");
      continue;
    }
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY_PER_LINE) {
      problem(`Quantity must be between 1 and ${MAX_QTY_PER_LINE}.`);
      continue;
    }
    if (variant.stock !== null && variant.stock < line.qty) {
      problem(variant.stock === 0 ? "Sold out." : `Only ${variant.stock} left.`);
      continue;
    }
    items.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantLabel: variant.label,
      image: product.images[0] ?? null,
      unitPricePaise: variant.pricePaise,
      qty: line.qty,
      lineTotalPaise: variant.pricePaise * line.qty,
    });
  }

  const subtotalPaise = items.reduce((sum, i) => sum + i.lineTotalPaise, 0);
  const threshold = settings.freeShippingAbovePaise;
  const freeShipping = threshold !== null && subtotalPaise >= threshold;
  const shippingPaise =
    fulfilment === "pickup" || items.length === 0 || freeShipping ? 0 : settings.shippingFeePaise;

  return {
    items,
    problems,
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    toFreeShippingPaise:
      fulfilment === "ship" && threshold !== null && !freeShipping ? threshold - subtotalPaise : null,
    belowMinimum: subtotalPaise < settings.minOrderPaise,
  };
}

export function isPurchasable(product: Product): boolean {
  return product.active && product.variants.some((v) => v.active && v.pricePaise !== null && v.stock !== 0);
}

/** Lowest live price, for "from ₹99" labels. */
export function fromPrice(product: Product): number | null {
  const prices = product.variants
    .filter((v) => v.active && v.pricePaise !== null)
    .map((v) => v.pricePaise as number);
  return prices.length ? Math.min(...prices) : null;
}
