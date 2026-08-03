import { OrderStatus } from "@prisma/client";

// Define the valid next states for each order status matching Prisma OrderStatus enum.
export const ORDER_STATE_TRANSITIONS: Record<string, string[]> = {
  created: ["sent", "confirmed", "pending", "payment_pending", "paid", "cancelled"],
  sent: ["confirmed", "paid", "fulfilled", "cancelled"],
  pending: ["payment_pending", "verified", "cancelled"],
  payment_pending: ["paid", "cancelled", "failed_delivery"],
  paid: ["processing", "verified", "fulfilled", "refunded", "cancelled"],
  processing: ["verified", "print_queue", "cancelled"],
  verified: ["print_queue", "cancelled"],
  print_queue: ["printing", "cancelled"],
  printing: ["quality_check", "cancelled"],
  quality_check: ["packing", "print_queue", "cancelled"],
  packing: ["ready_for_dispatch", "fulfilled", "cancelled"],
  ready_for_dispatch: ["shipped", "cancelled"],
  shipped: ["delivered", "failed_delivery", "lost_shipment", "returned"],
  delivered: ["completed", "returned", "replacement"],
  completed: [],
  cancelled: [],
  refunded: [],
  replacement: ["processing", "print_queue"],
  returned: ["refunded", "replacement"],
  failed_delivery: ["returned", "replacement", "refunded"],
  lost_shipment: ["refunded", "replacement"],
};

export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function validateStateTransition(current: string, next: string): void {
  if (current === next) return;
  const allowed = ORDER_STATE_TRANSITIONS[current] || ["confirmed", "paid", "fulfilled", "cancelled"];
  if (!allowed.includes(next)) {
    throw new InvalidStateTransitionError(current, next);
  }
}

export function canTransition(current: string, next: string): boolean {
  if (current === next) return true;
  const allowed = ORDER_STATE_TRANSITIONS[current] || ["confirmed", "paid", "fulfilled", "cancelled"];
  return allowed ? allowed.includes(next) : false;
}
