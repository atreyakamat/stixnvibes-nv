import { stallReport } from "./costs";
import { customersFromOrders } from "./customers";
import type { Order, Product, Settings, Stall, StallSale } from "./types";

// Numbers for deciding what to do next: which stalls are worth going back
// to, what to restock, and how many online buyers come back.

const HOUR = 3_600_000;

export type StallRank = {
  id: string;
  name: string;
  date: string;
  venue: string;
  collegeId: string | null;
  sales: number;
  revenuePaise: number;
  profitPaise: number;
  /**
   * First sale to last sale, rounded up to the half hour, at least 1 hour.
   * Stalls don't record opening hours, so this is the selling time. Null
   * with no sales.
   */
  hours: number | null;
  profitPerHourPaise: number | null;
};

export type VenueRank = { key: string; venue: string; collegeId: string | null; stalls: number; profitPaise: number; avgProfitPaise: number; avgPerHourPaise: number | null };

export function sellingHours(sales: Pick<StallSale, "soldAt">[]): number | null {
  if (sales.length === 0) return null;
  const times = sales.map((s) => Date.parse(s.soldAt)).filter(Number.isFinite);
  if (times.length === 0) return null;
  const span = (Math.max(...times) - Math.min(...times)) / HOUR;
  return Math.max(1, Math.ceil(span * 2) / 2);
}

/** Past stalls, best profit per hour first; stalls with no sales last. */
export function rankStalls(stalls: Stall[], sales: StallSale[], products: Product[], costs: Settings["unitCosts"], today: string) {
  const rows: StallRank[] = stalls
    .filter((s) => s.date <= today)
    .map((s) => {
      const r = stallReport(s, sales, products, costs);
      const hours = sellingHours(sales.filter((x) => x.stallId === s.id));
      return {
        id: s.id,
        name: s.name,
        date: s.date,
        venue: s.venue,
        collegeId: s.collegeId,
        sales: r.sales,
        revenuePaise: r.revenuePaise,
        profitPaise: r.profitPaise,
        hours,
        profitPerHourPaise: hours ? Math.round(r.profitPaise / hours) : null,
      };
    })
    .sort((a, b) => (b.profitPerHourPaise ?? -Infinity) - (a.profitPerHourPaise ?? -Infinity) || b.date.localeCompare(a.date));

  // The same place across visits: by college when it's set, else by venue name.
  const groups = new Map<string, StallRank[]>();
  for (const r of rows) {
    const key = r.collegeId ? `college:${r.collegeId}` : `venue:${r.venue.trim().toLowerCase() || r.name.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const venues: VenueRank[] = [...groups].map(([key, list]) => {
    const profitPaise = list.reduce((n, r) => n + r.profitPaise, 0);
    const timed = list.filter((r) => r.hours);
    const hours = timed.reduce((n, r) => n + r.hours!, 0);
    return {
      key,
      venue: list[0].venue || list[0].name,
      collegeId: list[0].collegeId,
      stalls: list.length,
      profitPaise,
      avgProfitPaise: Math.round(profitPaise / list.length),
      avgPerHourPaise: hours ? Math.round(timed.reduce((n, r) => n + r.profitPaise, 0) / hours) : null,
    };
  });
  venues.sort((a, b) => (b.avgPerHourPaise ?? -Infinity) - (a.avgPerHourPaise ?? -Infinity) || b.avgProfitPaise - a.avgProfitPaise);
  return { stalls: rows, venues };
}

export type Restock = {
  id: string;
  name: string;
  image: string | null;
  stock: number;
  lowStockAt: number;
  /** Units sold online and at stalls in the window. */
  sold: number;
  perWeek: number;
  /** At this pace; null when nothing sold in the window. */
  daysLeft: number | null;
  /** To last about a month at this pace, and stay above the low stock mark. */
  suggest: number;
};

/**
 * Products with stock counts that are low, or will run out within `soonDays`
 * at the pace they sold over the last `windowDays`. Soonest out first.
 */
export function restockList(products: Product[], orders: Order[], sales: StallSale[], windowDays = 30, soonDays = 14, now = new Date()): Restock[] {
  const since = new Date(now.getTime() - windowDays * 24 * HOUR).toISOString();
  const sold = new Map<string, number>();
  const add = (id: string, qty: number) => id && sold.set(id, (sold.get(id) ?? 0) + qty);
  for (const o of orders) if (o.status !== "cancelled" && o.createdAt >= since) for (const l of o.lines) add(l.productId, l.qty);
  for (const s of sales) if (s.soldAt >= since) for (const l of s.lines) add(l.productId, l.qty);

  const out: Restock[] = [];
  for (const p of products) {
    if (p.stock === null || p.status === "hidden") continue;
    const n = sold.get(p.id) ?? 0;
    const perDay = n / windowDays;
    const daysLeft = perDay > 0 ? Math.floor(p.stock / perDay) : null;
    if (p.stock > p.lowStockAt && (daysLeft === null || daysLeft > soonDays)) continue;
    const target = Math.max(Math.ceil(perDay * 30), p.lowStockAt + 1);
    out.push({
      id: p.id,
      name: p.name,
      image: p.images[0] ?? null,
      stock: p.stock,
      lowStockAt: p.lowStockAt,
      sold: n,
      perWeek: Math.round(perDay * 7 * 10) / 10,
      daysLeft,
      suggest: Math.max(0, target - p.stock),
    });
  }
  return out.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) || a.stock - b.stock);
}

export type RepeatReport = {
  customers: number;
  repeat: number;
  /** 0 to 1. */
  rate: number;
  /** Share of online takings from people who ordered more than once, 0 to 1. */
  repeatShare: number;
  /** Middle gap between a buyer's first and second order, in days. */
  medianDaysToSecond: number | null;
  top: { phone: string; name: string; orders: number; spentPaise: number; lastAt: string }[];
};

/** Online buyers only: stall sales don't record who bought. */
export function repeatBuyers(orders: Order[]): RepeatReport {
  const live = orders.filter((o) => o.status !== "cancelled");
  const customers = customersFromOrders(live);
  const repeaters = customers.filter((c) => c.orders > 1);
  const spent = customers.reduce((n, c) => n + c.spentPaise, 0);

  const firstTwo = new Map<string, string[]>();
  for (const o of [...live].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!o.customerPhone) continue;
    const list = firstTwo.get(o.customerPhone) ?? [];
    if (list.length < 2) firstTwo.set(o.customerPhone, [...list, o.createdAt]);
  }
  const gaps = [...firstTwo.values()]
    .filter((l) => l.length === 2)
    .map(([a, b]) => (Date.parse(b) - Date.parse(a)) / (24 * HOUR))
    .sort((a, b) => a - b);
  const mid = gaps.length ? (gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2) : null;

  return {
    customers: customers.length,
    repeat: repeaters.length,
    rate: customers.length ? repeaters.length / customers.length : 0,
    repeatShare: spent ? repeaters.reduce((n, c) => n + c.spentPaise, 0) / spent : 0,
    medianDaysToSecond: mid === null ? null : Math.round(mid),
    top: repeaters
      .sort((a, b) => b.spentPaise - a.spentPaise)
      .slice(0, 5)
      .map((c) => ({ phone: c.phone, name: c.name, orders: c.orders, spentPaise: c.spentPaise, lastAt: c.lastAt })),
  };
}
