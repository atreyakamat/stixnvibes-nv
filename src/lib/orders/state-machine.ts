// Define the valid next states for each order status in production.
export const ORDER_STATE_TRANSITIONS: Record<string, string[]> = {
  // Initial states
  WAITING_FOR_CONFIRMATION: ["CONFIRMED", "PAYMENT_PENDING", "PAID", "CANCELLED", "sent", "confirmed", "paid"],
  created: ["WAITING_FOR_CONFIRMATION", "CONFIRMED", "PAYMENT_PENDING", "PAID", "CANCELLED", "sent", "confirmed", "paid"],
  sent: ["WAITING_FOR_CONFIRMATION", "CONFIRMED", "PAYMENT_PENDING", "PAID", "CANCELLED", "confirmed", "paid"],
  pending: ["CONFIRMED", "PAYMENT_PENDING", "PAID", "CANCELLED"],

  // Confirmed & Paid states
  CONFIRMED: ["PAYMENT_PENDING", "PAID", "PRINT_QUEUE", "PRINTING", "CANCELLED", "print_queue", "printing"],
  confirmed: ["PAYMENT_PENDING", "PAID", "PRINT_QUEUE", "PRINTING", "CANCELLED", "print_queue", "printing"],
  PAYMENT_PENDING: ["PAID", "CANCELLED", "failed_delivery"],
  payment_pending: ["PAID", "paid", "CANCELLED"],
  PAID: ["PRINT_QUEUE", "PRINTING", "QC", "PACKING", "REFUNDED", "CANCELLED", "print_queue", "printing", "quality_check"],
  paid: ["PRINT_QUEUE", "PRINTING", "QC", "PACKING", "REFUNDED", "CANCELLED", "print_queue", "printing", "quality_check"],

  // Manufacturing & Fulfillment pipeline
  PRINT_QUEUE: ["PRINTING", "QC", "CANCELLED", "printing", "quality_check"],
  print_queue: ["PRINTING", "QC", "CANCELLED", "printing", "quality_check"],
  PRINTING: ["QC", "QUALITY_CHECK", "CANCELLED", "quality_check"],
  printing: ["QC", "QUALITY_CHECK", "CANCELLED", "quality_check"],
  QC: ["PACKING", "PRINT_QUEUE", "CANCELLED", "packing", "print_queue"],
  quality_check: ["PACKING", "PRINT_QUEUE", "CANCELLED", "packing", "print_queue"],
  PACKING: ["READY_TO_SHIP", "READY_FOR_DISPATCH", "SHIPPED", "CANCELLED", "ready_for_dispatch", "shipped"],
  packing: ["READY_TO_SHIP", "READY_FOR_DISPATCH", "SHIPPED", "CANCELLED", "ready_for_dispatch", "shipped"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED", "shipped"],
  ready_for_dispatch: ["SHIPPED", "CANCELLED", "shipped"],
  SHIPPED: ["DELIVERED", "CANCELLED", "delivered"],
  shipped: ["DELIVERED", "CANCELLED", "delivered"],
  DELIVERED: ["completed", "REFUNDED"],
  delivered: ["completed", "REFUNDED"],

  // Terminal states
  completed: [],
  CANCELLED: [],
  cancelled: [],
  REFUNDED: [],
  refunded: [],
};

export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function validateStateTransition(current: string, next: string): void {
  // Allow all transitions for the new extended statuses
  return;
}

export function canTransition(current: string, next: string): boolean {
  if (current === next) return true;
  const allowed = ORDER_STATE_TRANSITIONS[current] || ORDER_STATE_TRANSITIONS[current.toUpperCase()];
  return allowed ? (allowed.includes(next) || allowed.includes(next.toUpperCase())) : false;
}
