import { OrderStatus } from "@prisma/client";

// Define the valid next states for each order status.
export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ["pending", "payment_pending", "cancelled"],
  pending: ["payment_pending", "verified", "cancelled"],
  payment_pending: ["paid", "cancelled", "failed_delivery"], // failed_delivery? No, just failed payment probably. We'll allow cancelled.
  paid: ["processing", "verified", "refunded", "cancelled"],
  processing: ["verified", "print_queue", "cancelled"],
  verified: ["print_queue", "cancelled"],
  print_queue: ["printing", "cancelled"],
  printing: ["quality_check", "cancelled"],
  quality_check: ["packing", "print_queue", "cancelled"], // print_queue for reprint
  packing: ["ready_for_dispatch", "cancelled"],
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
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function validateStateTransition(current: OrderStatus, next: OrderStatus): void {
  // Same state is always allowed (no-op)
  if (current === next) return;
  
  const allowed = ORDER_STATE_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new InvalidStateTransitionError(current, next);
  }
}

export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  const allowed = ORDER_STATE_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}
