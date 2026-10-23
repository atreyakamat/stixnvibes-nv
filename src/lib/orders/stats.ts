import type { Order } from "@/lib/types";
import { isPaid } from "./status";

const DAY = 86_400_000;

/** Paid order value placed within the last `days` days. */
export function revenueSince(orders: Order[], days: number, now = Date.now()): number {
  return orders
    .filter((o) => isPaid(o) && now - Date.parse(o.createdAt) < days * DAY)
    .reduce((sum, o) => sum + o.totalPaise, 0);
}
