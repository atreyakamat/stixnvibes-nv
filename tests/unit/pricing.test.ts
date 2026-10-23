import { describe, expect, it } from "vitest";
import { CAMPAIGNS, nextWindow } from "@/content/campaigns";
import {
  applyOffers,
  campaignBanner,
  canOrder,
  defaultSelections,
  fromPrice,
  liveOffers,
  minQtyShortfalls,
  mrpFor,
  offerHints,
  resolveOptions,
  shippingStatus,
  totals,
  unitPrice,
} from "@/lib/pricing";
import { demoProducts, NO_CAMPAIGN, seedOffers, seedProducts } from "@/lib/store/seed";
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
    const all: Offer = { id: "o-all", kind: "bxgy", name: "Any 2 get 1", description: "", productType: null, buy: 2, free: 1, pricePaise: null, ...NO_CAMPAIGN, active: true, sortOrder: 5 };
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
    expect(defaultSelections(poster)).toEqual({ size: "a4", print: "normal" });
    expect(unitPrice(poster, {})).toBe(6000);
  });

  it("prices posters: A4 ₹60, A3 ₹100, A4 framed ₹200, A3 framed ₹400", () => {
    const r = resolveOptions(poster, { size: "a3", print: "sticker" })!;
    expect(r.labels).toEqual(["Size: A3", "Print: Sticker (peel and paste)"]);
    expect(["a4", "a3", "a4-framed", "a3-framed"].map((size) => unitPrice(poster, { size }))).toEqual([6000, 10000, 20000, 40000]);
    expect(fromPrice(poster)).toBe(6000);
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
  it("prices stickers ₹10, sheets ₹80, music cards ₹20 (min 5), wall cards ₹30", () => {
    const seed = seedProducts();
    expect(seed.filter((p) => p.type === "sticker").every((p) => p.pricePaise === 1000)).toBe(true);
    expect(seed.find((p) => p.type === "sheet")!.pricePaise).toBe(8000);
    expect(seed.find((p) => p.type === "music-card")).toMatchObject({ pricePaise: 2000, minQty: 5 });
    expect(seed.find((p) => p.type === "wall-card")).toMatchObject({ pricePaise: 3000, status: "live" });
  });
});

describe("bulk prices", () => {
  const wall = (qty: number) => ({ type: "wall-card" as const, unitPricePaise: 3000, qty });
  const sheet = (qty: number) => ({ type: "sheet" as const, unitPricePaise: 8000, qty });

  it("wall cards: ₹30, ₹25 each for 6+, ₹20 each for 11+", () => {
    expect(totals([wall(5)], offers).totalPaise).toBe(15000);
    expect(totals([wall(6)], offers).totalPaise).toBe(15000);
    expect(totals([wall(3), wall(3)], offers).totalPaise).toBe(15000);
    expect(totals([wall(11)], offers)).toMatchObject({ totalPaise: 22000, applied: [{ offerId: "o-wall-11", discountPaise: 11000 }] });
  });

  it("sheets: ₹80, ₹65 each for 11+", () => {
    expect(totals([sheet(10)], offers).totalPaise).toBe(80000);
    expect(totals([sheet(11)], offers).totalPaise).toBe(71500);
  });

  it("nudges toward the next tier", () => {
    const w = (_: unknown, n: number) => (n === 1 ? "wall card" : "wall cards");
    expect(offerHints([wall(4)], offers, w)).toEqual(["Add 2 more wall cards to pay ₹25 each."]);
    expect(offerHints([wall(7)], offers, w)).toEqual(["Add 4 more wall cards to pay ₹20 each."]);
    expect(offerHints([wall(11)], offers, w)).toEqual([]);
  });
});

describe("minimums and shipping", () => {
  it("flags products below their minimum, summed over lines", () => {
    const products = [{ id: "m", name: "Music card", minQty: 5 }];
    expect(minQtyShortfalls([{ productId: "m", qty: 2 }, { productId: "m", qty: 1 }], products)).toEqual([{ productId: "m", name: "Music card", minQty: 5, need: 2 }]);
    expect(minQtyShortfalls([{ productId: "m", qty: 5 }], products)).toEqual([]);
  });

  it("free shipping from ₹250", () => {
    expect(shippingStatus(24000, 25000)).toEqual({ free: false, needPaise: 1000 });
    expect(shippingStatus(25000, 25000)).toEqual({ free: true, needPaise: 0 });
    expect(shippingStatus(100, null)).toBeNull();
  });
});

const sale = (percent: number, extra: Partial<Offer> = {}): Offer => ({
  id: `o-sale-${percent}`,
  kind: "percent",
  name: `${percent}% off`,
  description: "",
  productType: null,
  buy: 1,
  free: 1,
  pricePaise: null,
  ...NO_CAMPAIGN,
  percent,
  active: true,
  sortOrder: 9,
  ...extra,
});

describe("% off campaigns", () => {
  it("takes the % off what's left after free items", () => {
    // 5 stickers: 1 free (₹10), then 10% off the 4 paid ones (₹4).
    const r = applyOffers([sticker(1000, 5)], [...offers, sale(10)]);
    expect(r.applied).toEqual([
      { offerId: "o-stickers", name: "Buy 4 stickers, get 1 free", freeUnits: 1, discountPaise: 1000 },
      { offerId: "o-sale-10", name: "10% off", freeUnits: 0, discountPaise: 400 },
    ]);
  });

  it("applies after bulk prices, keeps to its type, and uses the best % per item", () => {
    const sheets = { type: "sheet" as const, unitPricePaise: 8000, qty: 11 };
    // 11 sheets at ₹65 = ₹715; 20% off on sheets only = ₹143.
    const r = applyOffers([sheets, sticker(1000, 1)], [...offers, sale(20, { productType: "sheet" }), sale(5)]);
    expect(r.applied.find((a) => a.offerId === "o-sale-20")?.discountPaise).toBe(14300);
    // The sticker gets the 5% sale (50 paise); sheets don't, since 20% beats 5%.
    expect(r.applied.find((a) => a.offerId === "o-sale-5")?.discountPaise).toBe(50);
  });

  it("only runs inside its dates", () => {
    const o = sale(10, { startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-11-10T00:00:00.000Z", banner: "Diwali!" });
    expect(liveOffers([o], new Date("2026-10-31T23:59:00Z"))).toEqual([]);
    expect(liveOffers([o], new Date("2026-11-05T00:00:00Z"))).toEqual([o]);
    expect(liveOffers([o], new Date("2026-11-10T00:00:00Z"))).toEqual([]);
    expect(campaignBanner([o], new Date("2026-11-05T00:00:00Z"))).toBe("Diwali!");
    expect(campaignBanner([{ ...o, active: false }], new Date("2026-11-05T00:00:00Z"))).toBe("");
  });

  it("has a next window for every template", () => {
    const now = new Date("2026-10-23T00:00:00Z");
    for (const c of CAMPAIGNS) expect(nextWindow(c, now), c.id).not.toBeNull();
    const diwali = nextWindow(CAMPAIGNS.find((c) => c.id === "diwali")!, now)!;
    // 7 days before 8 Nov, midnight IST, to the end of 10 Nov IST.
    expect(diwali).toEqual({ day: "2026-11-08", startsAt: "2026-10-31T18:30:00.000Z", endsAt: "2026-11-10T18:30:00.000Z" });
  });
});

describe("MRP", () => {
  it("adds the markup and rounds up to the rupee", () => {
    expect(mrpFor(1000, null, 20)).toBe(1200);
    expect(mrpFor(6000, null, 20)).toBe(7200);
    expect(mrpFor(2500, null, 10)).toBe(2800);
  });
  it("prefers the product's own was-price and can be off", () => {
    expect(mrpFor(1000, 1500, 20)).toBe(1500);
    expect(mrpFor(1000, 900, 20)).toBe(1200);
    expect(mrpFor(1000, null, null)).toBeNull();
    expect(mrpFor(null, null, 20)).toBeNull();
  });
});
