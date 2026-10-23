import { describe, expect, it } from "vitest";
import { fromPrice, isPurchasable, quoteCart } from "@/lib/orders/pricing";
import { DEMO_SETTINGS, demoProducts, seedProducts } from "@/lib/store/seed";
import type { Product } from "@/lib/types";

const products = demoProducts();
const sticker = products.find((p) => p.slug === "lofi-01")!;
const line = (p: Product, qty: number) => ({ productId: p.id, variantId: p.variants[0].id, qty });

describe("quoteCart", () => {
  it("prices from the catalog, never from the client", () => {
    const q = quoteCart([line(sticker, 3)], products, DEMO_SETTINGS, "ship");
    expect(q.problems).toEqual([]);
    expect(q.subtotalPaise).toBe(3 * 4900);
    expect(q.shippingPaise).toBe(DEMO_SETTINGS.shippingFeePaise);
    expect(q.totalPaise).toBe(3 * 4900 + DEMO_SETTINGS.shippingFeePaise);
  });

  it("merges duplicate lines for the same variant", () => {
    const q = quoteCart([line(sticker, 1), line(sticker, 2)], products, DEMO_SETTINGS, "ship");
    expect(q.items).toHaveLength(1);
    expect(q.items[0].qty).toBe(3);
  });

  it("gives free shipping at the threshold and for pickup", () => {
    const big = quoteCart([line(sticker, 11)], products, DEMO_SETTINGS, "ship");
    expect(big.subtotalPaise).toBeGreaterThanOrEqual(DEMO_SETTINGS.freeShippingAbovePaise!);
    expect(big.shippingPaise).toBe(0);
    expect(big.toFreeShippingPaise).toBeNull();
    const pickup = quoteCart([line(sticker, 1)], products, DEMO_SETTINGS, "pickup");
    expect(pickup.shippingPaise).toBe(0);
  });

  it("tells you how far you are from free shipping", () => {
    const q = quoteCart([line(sticker, 1)], products, DEMO_SETTINGS, "ship");
    expect(q.toFreeShippingPaise).toBe(DEMO_SETTINGS.freeShippingAbovePaise! - 4900);
  });

  it("rejects unpriced, inactive, unknown and over-stock items", () => {
    const unpriced = seedProducts()[0];
    const hidden = { ...sticker, id: "hidden", active: false, variants: [{ ...sticker.variants[0], id: "vh" }] };
    const limited = { ...sticker, id: "lim", variants: [{ ...sticker.variants[0], id: "vl", stock: 2 }] };
    const q = quoteCart(
      [line(unpriced, 1), line(hidden, 1), { productId: "nope", variantId: "nope", qty: 1 }, line(limited, 3)],
      [unpriced, hidden, limited],
      DEMO_SETTINGS,
      "ship",
    );
    expect(q.items).toEqual([]);
    expect(q.problems.map((p) => p.reason)).toEqual([
      "This item isn't on sale online yet.",
      "This item is no longer available.",
      "This item is no longer available.",
      "Only 2 left.",
    ]);
    expect(q.shippingPaise).toBe(0);
  });

  it("flags orders below the minimum", () => {
    const q = quoteCart([line(sticker, 1)], products, { ...DEMO_SETTINGS, minOrderPaise: 10000 }, "ship");
    expect(q.belowMinimum).toBe(true);
  });
});

describe("product helpers", () => {
  it("knows what can be bought", () => {
    expect(isPurchasable(sticker)).toBe(true);
    expect(isPurchasable(seedProducts()[0])).toBe(false);
    expect(isPurchasable({ ...sticker, variants: [{ ...sticker.variants[0], stock: 0 }] })).toBe(false);
  });

  it("finds the lowest live price", () => {
    const p = {
      ...sticker,
      variants: [
        { ...sticker.variants[0], id: "a", pricePaise: 9900 },
        { ...sticker.variants[0], id: "b", pricePaise: 4900 },
        { ...sticker.variants[0], id: "c", pricePaise: 100, active: false },
      ],
    };
    expect(fromPrice(p)).toBe(4900);
    expect(fromPrice(seedProducts()[0])).toBeNull();
  });
});
