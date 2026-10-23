import { describe, expect, it } from "vitest";
import { applyOffers, canOrder, defaultSelections, fromPrice, offerHints, resolveOptions, totals, unitPrice } from "@/lib/pricing";
import { demoProducts, seedOffers, seedProducts } from "@/lib/store/seed";
import type { Offer } from "@/lib/types";

const offers = seedOffers();
const sticker = (price = 1000, qty = 1) => ({ type: "sticker" as const, unitPricePaise: price, qty });
const poster = (price: number, qty = 1) => ({ type: "poster" as const, unitPricePaise: price, qty });
const word = (_: unknown, n: number) => (n === 1 ? "sticker" : "stickers");

describe("buy X get Y offers", () => {
  it("gives the 5th sticker free (buy 4 get 1)", () => {
    expect(applyOffers([sticker(1000, 4)], offers).discountPaise).toBe(0);
    const r = applyOffers([sticker(1000, 5)], offers);
    expect(r.discountPaise).toBe(1000);
    expect(r.applied).toEqual([{ offerId: "o-stickers", name: "Buy 4 stickers, get 1 free", freeUnits: 1, discountPaise: 1000 }]);
    expect(applyOffers([sticker(1000, 10)], offers).discountPaise).toBe(2000);
    expect(applyOffers([sticker(1000, 14)], offers).discountPaise).toBe(2000);
  });

  it("makes the cheapest item in each group free", () => {
    // Prices 50, 40, 30, 20, 10 → one group, the ₹10 one is free.
    const lines = [50, 40, 30, 20, 10].map((r) => sticker(r * 100));
    expect(applyOffers(lines, offers).discountPaise).toBe(1000);
  });

  it("gives every 6th poster free (buy 5 get 1) and keeps offers to their type", () => {
    const r = totals([poster(9900, 6), sticker(1000, 3)], offers);
    expect(r.subtotalPaise).toBe(9900 * 6 + 3000);
    expect(r.discountPaise).toBe(9900);
    expect(r.totalPaise).toBe(9900 * 5 + 3000);
  });

  it("ignores inactive offers and counts a unit toward one offer only", () => {
    const all: Offer = { id: "o-all", name: "Any 2 get 1", description: "", productType: null, buy: 2, free: 1, active: true, sortOrder: 5 };
    expect(applyOffers([sticker(1000, 5)], [{ ...offers[0], active: false }]).discountPaise).toBe(0);
    // 6 stickers: first offer takes 5 (₹10 off), the leftover 1 can't fill a group of 3.
    expect(applyOffers([sticker(1000, 6)], [offers[0], all]).discountPaise).toBe(1000);
  });

  it("nudges toward the next free item", () => {
    expect(offerHints([sticker(1000, 4)], offers, word)).toEqual(["Add 1 more sticker and it's free (Buy 4 stickers, get 1 free)."]);
    expect(offerHints([sticker(1000, 2)], offers, word)).toEqual(["Add 2 more stickers to unlock Buy 4 stickers, get 1 free."]);
    expect(offerHints([sticker(1000, 5)], offers, word)).toEqual([]);
  });
});

describe("options", () => {
  const poster = demoProducts().find((p) => p.type === "poster")!;

  it("defaults to the first choice of each option", () => {
    expect(defaultSelections(poster)).toEqual({ size: "a4", print: "normal", frame: "none" });
    expect(unitPrice(poster, {})).toBe(9900);
  });

  it("adds price changes and labels picked choices", () => {
    const r = resolveOptions(poster, { size: "a3", frame: "framed" })!;
    expect(r.labels).toEqual(["Size: A3", "Print: Normal print", "Frame: Framed"]);
    expect(unitPrice(poster, { size: "a3", frame: "framed" })).toBe(9900 + 5000 + 15000);
    expect(fromPrice(poster)).toBe(9900);
  });

  it("rejects choices that don't exist", () => {
    expect(resolveOptions(poster, { size: "a0" })).toBeNull();
    expect(unitPrice(poster, { size: "a0" })).toBeNull();
  });

  it("only live, in-stock, priced products can be ordered", () => {
    const [s] = seedProducts();
    expect(canOrder(s)).toBe(true);
    expect(canOrder({ ...s, status: "upcoming" })).toBe(false);
    expect(canOrder({ ...s, soldOut: true })).toBe(false);
    expect(canOrder({ ...s, pricePaise: null })).toBe(false);
  });
});

describe("seed facts", () => {
  it("prices stickers at ₹10 and the super sheet at ₹65", () => {
    const seed = seedProducts();
    expect(seed.filter((p) => p.type === "sticker").every((p) => p.pricePaise === 1000)).toBe(true);
    expect(seed.find((p) => p.type === "sheet")!.pricePaise).toBe(6500);
  });
});
