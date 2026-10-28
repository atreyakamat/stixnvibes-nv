import { describe, expect, it } from "vitest";
import { rankStalls, repeatBuyers, restockList, sellingHours } from "@/lib/insights";
import { demoProducts } from "@/lib/store/seed";
import type { Order, Stall, StallSale } from "@/lib/types";

const stall = (id: string, over: Partial<Stall> = {}): Stall => ({
  id, name: `Stall ${id}`, date: "2026-10-01", venue: "Campus", collegeId: null, feePaise: 0, otherCostsPaise: 0, notes: "", public: false, createdAt: "2026-09-01T00:00:00Z", ...over,
});
const sale = (id: string, stallId: string, soldAt: string, totalPaise: number, productId = ""): StallSale => ({
  id, stallId, soldAt, totalPaise, subtotalPaise: totalPaise, discountPaise: 0, payment: "cash", note: "", createdAt: soldAt,
  lines: [{ productId, name: "x", type: "other", options: [], qty: 1, unitPricePaise: totalPaise, lineTotalPaise: totalPaise }],
});
const order = (phone: string, createdAt: string, totalPaise: number, status: Order["status"] = "done", lines: Order["lines"] = []) =>
  ({ number: `SNV-${createdAt}`, customerPhone: phone, customerName: phone, createdAt, totalPaise, status, fulfilment: "pickup", address: { line: "" }, lines }) as unknown as Order;

describe("stall ranking", () => {
  it("counts first to last sale, rounded up to the half hour, at least an hour", () => {
    expect(sellingHours([])).toBeNull();
    expect(sellingHours([{ soldAt: "2026-10-01T05:00:00Z" }])).toBe(1);
    expect(sellingHours([{ soldAt: "2026-10-01T05:00:00Z" }, { soldAt: "2026-10-01T07:10:00Z" }])).toBe(2.5);
  });

  it("ranks by profit per hour, puts stalls with no sales last, and skips upcoming ones", () => {
    const stalls = [stall("a", { feePaise: 100_00 }), stall("b", { venue: "Fair" }), stall("c"), stall("d", { date: "2099-01-01" })];
    const sales = [
      sale("1", "a", "2026-10-01T05:00:00Z", 300_00), sale("2", "a", "2026-10-01T09:00:00Z", 300_00), // ₹500 over 4h
      sale("3", "b", "2026-10-01T05:00:00Z", 200_00), // ₹200 over 1h
    ];
    const { stalls: rows, venues } = rankStalls(stalls, sales, [], {}, "2026-10-27");
    expect(rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rows[1]).toMatchObject({ hours: 4, profitPaise: 500_00, profitPerHourPaise: 125_00 });
    expect(rows[2].profitPerHourPaise).toBeNull();
    // "a" and "c" are both at "Campus", so they make one place.
    expect(venues.find((v) => v.venue === "Campus")).toMatchObject({ stalls: 2, profitPaise: 500_00, avgPerHourPaise: 125_00 });
  });
});

describe("restock list", () => {
  it("lists low stock and products that run out soon at the 30-day pace", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    const [p1, p2, p3, p4] = demoProducts();
    const products = [
      { ...p1, stock: 10, lowStockAt: 2, status: "live" as const }, // sells 30 in 30 days, 10 days left
      { ...p2, stock: 1, lowStockAt: 2, status: "live" as const }, // low, no sales
      { ...p3, stock: 50, lowStockAt: 2, status: "live" as const }, // plenty
      { ...p4, stock: null },
    ];
    const line = (productId: string, qty: number) => ({ productId, qty }) as Order["lines"][number];
    const orders = [order("9000000001", "2026-10-20T00:00:00Z", 0, "done", [line(p1.id, 20)]), order("9000000001", "2026-10-21T00:00:00Z", 0, "cancelled", [line(p1.id, 99)])];
    const sales = [{ ...sale("s", "a", "2026-10-25T00:00:00Z", 0, p1.id), lines: [{ ...sale("s", "a", "", 0).lines[0], productId: p1.id, qty: 10 }] }];
    const list = restockList(products, orders, sales, 30, 14, now);
    expect(list.map((r) => r.id)).toEqual([p1.id, p2.id]);
    expect(list[0]).toMatchObject({ sold: 30, daysLeft: 10, perWeek: 7, suggest: 20 });
    expect(list[1]).toMatchObject({ daysLeft: null, suggest: 2 });
  });
});

describe("repeat buyers", () => {
  it("works out the repeat rate, their share and the gap to a second order", () => {
    const r = repeatBuyers([
      order("9000000001", "2026-10-01T00:00:00Z", 100_00),
      order("9000000001", "2026-10-11T00:00:00Z", 100_00),
      order("9000000002", "2026-10-02T00:00:00Z", 200_00),
      order("9000000002", "2026-10-03T00:00:00Z", 50_00, "cancelled"),
      order("9000000003", "2026-10-05T00:00:00Z", 100_00),
      order("9000000003", "2026-10-25T00:00:00Z", 100_00),
    ]);
    expect(r).toMatchObject({ customers: 3, repeat: 2, medianDaysToSecond: 15 });
    expect(r.rate).toBeCloseTo(2 / 3);
    expect(r.repeatShare).toBeCloseTo(400 / 600);
    expect(r.top).toHaveLength(2);
  });
});
