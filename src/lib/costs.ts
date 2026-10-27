import type { Order, Product, ProductType, Settings, Stall, StallSale } from "./types";

// What things cost to make, and what's left after: profit for the dashboard
// goal and per stall. Pure functions, no I/O.
//
// A unit's cost is, first match wins:
//   1. the product's own cost (Products > edit)
//   2. Settings unit cost for its type and a picked choice, e.g. "poster:a3"
//      (the highest when several picked choices have one)
//   3. Settings unit cost for its type, e.g. "poster"
//   4. nothing known: 0, and the type is listed in `missing`

/** Order statuses that count as a sale. */
export const SOLD_STATUSES: Order["status"][] = ["confirmed", "paid", "shipped", "done"];

type CostLine = { productId: string; type: ProductType | "other"; options: string[] };

/** The setting key for a type and option choice. */
export const costKey = (type: string, valueId?: string) => (valueId ? `${type}:${valueId}` : type);

/**
 * Cost of one unit of a line, or null when nothing is known. Option labels
 * look like "Size: A3"; they're matched back to the product's choices.
 */
export function unitCost(line: CostLine, product: Pick<Product, "costPaise" | "options"> | undefined, costs: Settings["unitCosts"]): number | null {
  if (product?.costPaise != null) return product.costPaise;
  let best: number | null = null;
  for (const label of line.options) {
    const i = label.indexOf(": ");
    if (i < 0 || !product) continue;
    const group = product.options.find((g) => g.name === label.slice(0, i));
    const value = group?.values.find((v) => v.label === label.slice(i + 2));
    const c = value ? costs[costKey(line.type, value.id)] : undefined;
    if (c !== undefined && (best === null || c > best)) best = c;
  }
  if (best !== null) return best;
  return costs[line.type] ?? null;
}

export type Takings = {
  revenuePaise: number;
  costPaise: number;
  units: number;
  /** Types sold with no cost set, so profit reads high for them. */
  missing: string[];
};

/** Revenue and cost of goods for a set of sold lines. */
export function takings(groups: { totalPaise: number; lines: (CostLine & { qty: number })[] }[], products: Product[], costs: Settings["unitCosts"]): Takings {
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = new Set<string>();
  let revenuePaise = 0;
  let costPaise = 0;
  let units = 0;
  for (const g of groups) {
    revenuePaise += g.totalPaise;
    for (const l of g.lines) {
      units += l.qty;
      const c = unitCost(l, byId.get(l.productId), costs);
      if (c === null) missing.add(l.type);
      else costPaise += c * l.qty;
    }
  }
  return { revenuePaise, costPaise, units, missing: [...missing] };
}

export type StallReport = Takings & {
  stall: Stall;
  sales: number;
  cashPaise: number;
  upiPaise: number;
  /** Revenue minus goods, fee and other costs. */
  profitPaise: number;
};

export function stallReport(stall: Stall, sales: StallSale[], products: Product[], costs: Settings["unitCosts"]): StallReport {
  const mine = sales.filter((x) => x.stallId === stall.id);
  const t = takings(mine, products, costs);
  const sum = (p: StallSale["payment"]) => mine.filter((x) => x.payment === p).reduce((n, x) => n + x.totalPaise, 0);
  return {
    ...t,
    stall,
    sales: mine.length,
    cashPaise: sum("cash"),
    upiPaise: sum("upi"),
    profitPaise: t.revenuePaise - t.costPaise - stall.feePaise - stall.otherCostsPaise,
  };
}

/** Best sellers by units across a set of stall sales. */
export function topProducts(sales: StallSale[], limit = 8) {
  const qty = new Map<string, number>();
  for (const x of sales) for (const l of x.lines) if (l.productId) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.qty);
  return [...qty]
    .map(([productId, n]) => ({ productId, qty: n }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export type GoalReport = {
  online: Takings;
  stalls: Takings;
  /** Stall fees and other stall costs in the period. */
  stallCostsPaise: number;
  profitPaise: number;
  goalPaise: number;
  /** 0 to 1. */
  progress: number;
  daysLeft: number;
  /** Profit still needed per week to reach the goal on time. */
  perWeekPaise: number;
  missing: string[];
};

/** Today's date in India, YYYY-MM-DD. */
export const istToday = (now = new Date()) => new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Midnight at the start of an India date, as an ISO time. */
export const istDayStart = (day: string) => new Date(`${day}T00:00:00+05:30`).toISOString();

/**
 * Profit from goalStart up to now: sold online orders and stall sales, less
 * what the goods cost and what the stalls cost to run.
 */
export function goalReport(
  settings: Pick<Settings, "goalPaise" | "goalStart" | "goalBy" | "unitCosts">,
  orders: Order[],
  sales: StallSale[],
  stalls: Stall[],
  products: Product[],
  now = new Date(),
): GoalReport {
  const since = istDayStart(settings.goalStart);
  const sold = orders.filter((o) => o.createdAt >= since && SOLD_STATUSES.includes(o.status));
  const online = takings(sold, products, settings.unitCosts);
  const stallSales = takings(
    sales.filter((x) => x.soldAt >= since),
    products,
    settings.unitCosts,
  );
  const today = istToday(now);
  const stallCostsPaise = stalls.filter((st) => st.date >= settings.goalStart && st.date <= today).reduce((n, st) => n + st.feePaise + st.otherCostsPaise, 0);
  const profitPaise = online.revenuePaise - online.costPaise + stallSales.revenuePaise - stallSales.costPaise - stallCostsPaise;
  const goalPaise = settings.goalPaise ?? 0;
  const daysLeft = Math.max(0, Math.ceil((Date.parse(istDayStart(settings.goalBy)) + 86_400_000 - now.getTime()) / 86_400_000));
  const left = Math.max(0, goalPaise - profitPaise);
  return {
    online,
    stalls: stallSales,
    stallCostsPaise,
    profitPaise,
    goalPaise,
    progress: goalPaise > 0 ? Math.max(0, Math.min(1, profitPaise / goalPaise)) : 0,
    daysLeft,
    perWeekPaise: daysLeft > 0 ? Math.ceil((left * 7) / daysLeft) : left,
    missing: [...new Set([...online.missing, ...stallSales.missing])],
  };
}
