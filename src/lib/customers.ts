import type { Address, Order } from "./types";

export type Customer = {
  /** 10-digit phone, the customer's identity. */
  phone: string;
  /** Name on their latest order. */
  name: string;
  orders: number;
  /** Total of orders that weren't cancelled. */
  spentPaise: number;
  /** Orders marked paid, shipped or done. */
  paidOrders: number;
  firstAt: string;
  lastAt: string;
  /** Latest delivery address, if they've had one delivered. */
  address: Address | null;
  pickups: number;
};

const PAID = new Set(["paid", "shipped", "done"]);

/**
 * Customers worked out from orders, grouped by phone number. Orders placed
 * before phone numbers were asked for have none and are left out.
 */
export function customersFromOrders(orders: Order[]): Customer[] {
  const byPhone = new Map<string, Customer>();
  const oldestFirst = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of oldestFirst) {
    if (!o.customerPhone) continue;
    const c =
      byPhone.get(o.customerPhone) ??
      byPhone
        .set(o.customerPhone, { phone: o.customerPhone, name: "", orders: 0, spentPaise: 0, paidOrders: 0, firstAt: o.createdAt, lastAt: o.createdAt, address: null, pickups: 0 })
        .get(o.customerPhone)!;
    c.orders++;
    c.lastAt = o.createdAt;
    if (o.customerName) c.name = o.customerName;
    if (o.status !== "cancelled") c.spentPaise += o.totalPaise;
    if (PAID.has(o.status)) c.paidOrders++;
    if (o.fulfilment === "pickup") c.pickups++;
    else if (o.address.line) c.address = o.address;
  }
  return [...byPhone.values()];
}

export type CustomerSort = "recent" | "spent" | "orders";

export function sortCustomers(list: Customer[], sort: CustomerSort): Customer[] {
  const out = [...list];
  if (sort === "spent") out.sort((a, b) => b.spentPaise - a.spentPaise || b.lastAt.localeCompare(a.lastAt));
  else if (sort === "orders") out.sort((a, b) => b.orders - a.orders || b.lastAt.localeCompare(a.lastAt));
  else out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return out;
}

/** "Repeat" from the second order, "Regular" from the fourth. */
export function customerTag(c: Pick<Customer, "orders">): string {
  return c.orders >= 4 ? "Regular" : c.orders >= 2 ? "Repeat" : "New";
}
