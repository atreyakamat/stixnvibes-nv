import { describe, expect, it } from "vitest";
import { goalReport, istToday, stallReport, takings, unitCost } from "@/lib/costs";
import { parseInline, parseMarkdown, plainText, safeUrl } from "@/lib/markdown";
import { cleanTracking, TRACKING_RE } from "@/lib/shipping";
import { priceStallCart, saleSchema, saleTimeProblem, tally, type StallCartLine } from "@/lib/stall";
import { MemoryStore } from "@/lib/store/memory";
import { DEFAULT_SETTINGS, demoProducts, seedOffers } from "@/lib/store/seed";
import type { Order, Product, Stall, StallSale } from "@/lib/types";

const costs = { sticker: 500, poster: 2500, "poster:a3": 5000 };
const poster = {
  costPaise: null,
  options: [{ name: "Size", values: [{ id: "a4", label: "A4", priceDeltaPaise: 0 }, { id: "a3", label: "A3", priceDeltaPaise: 5000 }] }],
} as unknown as Product;

const stall = (over: Partial<Stall> = {}): Stall => ({
  id: "st-1",
  name: "WordsUp",
  date: "2026-10-20",
  venue: "Xavier's",
  collegeId: null,
  feePaise: 150_000,
  otherCostsPaise: 20_000,
  notes: "",
  public: true,
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

const sale = (over: Partial<StallSale> = {}): StallSale => ({
  id: "s-0000-0001",
  stallId: "st-1",
  lines: [{ productId: "p-sticker", name: "Sticker", type: "sticker", options: [], qty: 10, unitPricePaise: 2000, lineTotalPaise: 20_000 }],
  subtotalPaise: 20_000,
  discountPaise: 0,
  totalPaise: 20_000,
  payment: "cash",
  note: "",
  soldAt: "2026-10-20T10:00:00.000Z",
  createdAt: "2026-10-20T10:00:00.000Z",
  ...over,
});

/** A sale as the phone sends it, before the server stamps createdAt. */
const sent = (over: Partial<StallSale> = {}) => {
  const x: Partial<StallSale> = sale(over);
  delete x.createdAt;
  return x as Omit<StallSale, "createdAt">;
};

describe("unit costs", () => {
  it("uses the product's own cost first", () => {
    expect(unitCost({ productId: "x", type: "poster", options: ["Size: A3"] }, { ...poster, costPaise: 999 }, costs)).toBe(999);
  });

  it("uses the cost for a picked choice, then the type", () => {
    expect(unitCost({ productId: "x", type: "poster", options: ["Size: A3"] }, poster, costs)).toBe(5000);
    expect(unitCost({ productId: "x", type: "poster", options: ["Size: A4"] }, poster, costs)).toBe(2500);
  });

  it("reports types with no cost as missing instead of guessing", () => {
    const t = takings([{ totalPaise: 5000, lines: [{ productId: "x", type: "wall-card", options: [], qty: 2 }] }], [], costs);
    expect(t).toMatchObject({ revenuePaise: 5000, costPaise: 0, units: 2, missing: ["wall-card"] });
  });
});

describe("stall profit", () => {
  it("takes goods, the fee and other costs off the takings", () => {
    const sales = [sale(), sale({ id: "s-0000-0002", payment: "upi" }), sale({ id: "s-0000-0003", stallId: "other" })];
    const r = stallReport(stall(), sales, [], costs);
    expect(r.sales).toBe(2);
    expect(r.revenuePaise).toBe(40_000);
    expect(r.cashPaise).toBe(20_000);
    expect(r.upiPaise).toBe(20_000);
    // 20 stickers at ₹5 = ₹100; fee ₹1500 + ₹200 other.
    expect(r.profitPaise).toBe(40_000 - 10_000 - 150_000 - 20_000);
  });

  it("counts the goal from goalStart, with only sold orders", () => {
    const order = (status: Order["status"], createdAt: string) =>
      ({ status, createdAt, totalPaise: 10_000, lines: [{ productId: "x", type: "sticker", options: [], qty: 2 }] }) as unknown as Order;
    const r = goalReport(
      { ...DEFAULT_SETTINGS, goalPaise: 100_000, goalStart: "2026-10-01", goalBy: "2026-10-31" },
      [order("paid", "2026-10-05T00:00:00Z"), order("cancelled", "2026-10-05T00:00:00Z"), order("paid", "2026-09-20T00:00:00Z")],
      [sale()],
      [stall({ feePaise: 0, otherCostsPaise: 0 })],
      [],
      new Date("2026-10-24T06:30:00Z"),
    );
    // Online: ₹100 - 2 × ₹5. Stall: ₹200 - 10 × ₹5.
    expect(r.profitPaise).toBe(9_000 + 15_000);
    expect(r.progress).toBeCloseTo(0.24);
    expect(r.daysLeft).toBe(8);
    expect(r.perWeekPaise).toBe(Math.ceil((76_000 * 7) / 8));
  });

  it("knows the India date", () => {
    expect(istToday(new Date("2026-10-26T19:00:00Z"))).toBe("2026-10-27");
  });
});

describe("stall cart", () => {
  const line = (over: Partial<StallCartLine> = {}): StallCartLine => ({
    key: "a",
    productId: "p",
    name: "Sticker",
    type: "sticker",
    options: [],
    unitPricePaise: 2000,
    qty: 5,
    ...over,
  });

  it("applies the shop's offers and a stall discount, never below zero", () => {
    const withOffers = priceStallCart([line()], seedOffers(), { applyOffers: true, extraDiscountPaise: 0 });
    const without = priceStallCart([line()], seedOffers(), { applyOffers: false, extraDiscountPaise: 500 });
    expect(withOffers.subtotalPaise).toBe(10_000);
    expect(withOffers.totalPaise).toBe(10_000 - withOffers.offerDiscountPaise);
    expect(without).toMatchObject({ discountPaise: 500, totalPaise: 9_500 });
    expect(priceStallCart([line()], [], { applyOffers: false, extraDiscountPaise: 1e9 }).totalPaise).toBe(0);
  });

  it("leaves one-off items out of the offers", () => {
    const r = priceStallCart([line({ type: "other", productId: "" })], seedOffers(), { applyOffers: true, extraDiscountPaise: 0 });
    expect(r.offerDiscountPaise).toBe(0);
  });

  it("rejects a sale whose numbers don't add up", () => {
    const good = sent();
    expect(saleSchema.safeParse(good).success).toBe(true);
    expect(saleSchema.safeParse({ ...good, totalPaise: 1 }).success).toBe(false);
    expect(saleSchema.safeParse({ ...good, subtotalPaise: 1, totalPaise: 1 }).success).toBe(false);
    expect(saleSchema.safeParse({ ...good, id: "bad id!" }).success).toBe(false);
  });

  it("rejects sale times from a wrong phone clock", () => {
    const now = Date.parse("2026-10-27T00:00:00Z");
    expect(saleTimeProblem("2026-10-26T10:00:00Z", now)).toBeNull();
    expect(saleTimeProblem("2026-11-05T00:00:00Z", now)).toMatch(/future/);
    expect(saleTimeProblem("2026-01-01T00:00:00Z", now)).toMatch(/120 days/);
    expect(saleTimeProblem("nope", now)).not.toBeNull();
  });

  it("tallies cash and UPI", () => {
    expect(tally([sale(), sale({ payment: "upi", totalPaise: 500 })])).toEqual({ cash: 20_000, upi: 500, total: 20_500, count: 2 });
  });
});

describe("stall sales in the store", () => {
  it("stores a sale once however often the phone sends it, and takes stock once", async () => {
    const products = demoProducts().map((p, i) => (i === 0 ? { ...p, stock: 20 } : p));
    const store = new MemoryStore({ products });
    const id = products[0].id;
    const input = sent({ id: "s-sync-0001", lines: [{ ...sale().lines[0], productId: id, qty: 3, lineTotalPaise: 6000 }], subtotalPaise: 6000, totalPaise: 6000 });
    expect((await store.recordStallSale(input)).created).toBe(true);
    expect((await store.recordStallSale(input)).created).toBe(false);
    expect((await store.getProduct(id))?.stock).toBe(17);
    await store.voidStallSale("s-sync-0001");
    expect((await store.getProduct(id))?.stock).toBe(20);
    expect(await store.listStallSales({ stallId: "st-1" })).toEqual([]);
  });

  it("exports everything but uploaded files and analytics", async () => {
    const data = await new MemoryStore().exportAll();
    expect(Object.keys(data)).toEqual(expect.arrayContaining(["products", "orders", "stalls", "stallSales", "posts", "gallery", "colleges"]));
    expect(data).not.toHaveProperty("uploads");
    expect(data).not.toHaveProperty("events");
  });
});

describe("blog markdown", () => {
  it("drops script links and keeps safe ones", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("//evil.example")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("/shop")).toBe("/shop");
    expect(parseInline("[click](javascript:void)")).toEqual([{ kind: "text", text: "click" }]);
    expect(parseInline("[ok](https://stixnvibes.com)")[0]).toMatchObject({ kind: "link", href: "https://stixnvibes.com/" });
  });

  it("keeps HTML as plain text", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>");
    expect(blocks.every((b) => b.kind === "paragraph")).toBe(true);
    expect(plainText("<b>hi</b>")).toBe("<b>hi</b>");
  });

  it("reads headings, lists, quotes and images", () => {
    const blocks = parseMarkdown("# Title\n\n- one\n- **two**\n\n> said\n\n![pic](/a.jpg)\n\n![bad](javascript:x)");
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "list", "quote", "image"]);
    expect(blocks[0]).toMatchObject({ level: 2 });
  });
});

describe("India Post tracking numbers", () => {
  it("cleans what's pasted in", () => {
    expect(cleanTracking(" ee 123 456 789 in ")).toBe("EE123456789IN");
    expect(TRACKING_RE.test("EE123456789IN")).toBe(true);
    expect(TRACKING_RE.test("<x>")).toBe(false);
  });
});
