export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export enum OrderStatus {
  CREATED = 'created',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PRODUCTION = 'production',
  PRINTING = 'printing',
  QC = 'qc',
  QC_FAILED = 'qc_failed',
  PACKING = 'packing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  PAYMENT_FAILED = 'payment_failed',
  CANCELLED = 'cancelled',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
  FULFILLED = 'fulfilled',
}

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.SENT, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.SENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PAID]: [OrderStatus.PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.PRODUCTION]: [OrderStatus.PRINTING, OrderStatus.CANCELLED],
  [OrderStatus.PRINTING]: [OrderStatus.QC],
  [OrderStatus.QC]: [OrderStatus.PACKING, OrderStatus.QC_FAILED],
  [OrderStatus.QC_FAILED]: [OrderStatus.PRODUCTION],
  [OrderStatus.PACKING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.FULFILLED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

// Backward compatibility
export const ORDER_STATE_TRANSITIONS = VALID_TRANSITIONS;

export function canTransition(from: OrderStatus | string, to: OrderStatus | string): boolean {
  if (from === to) return true;
  
  const fromNormalized = from.toLowerCase() as OrderStatus;
  const toNormalized = to.toLowerCase() as OrderStatus;

  const allowed = VALID_TRANSITIONS[fromNormalized];
  if (!allowed) return false;

  return allowed.includes(toNormalized);
}

export function getNextStates(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

export function isTerminal(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

export function isCancellable(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.includes(OrderStatus.CANCELLED) ?? false;
}

export function requiresInventoryRelease(from: OrderStatus, to: OrderStatus): boolean {
  if (to !== OrderStatus.CANCELLED) return false;
  
  const statesWithInventory = [
    OrderStatus.CONFIRMED,
    OrderStatus.PAID,
    OrderStatus.PRODUCTION,
    OrderStatus.PRINTING
  ];
  
  return statesWithInventory.includes(from);
}

export function validateStateTransition(current: string, next: string): void {
  if (!canTransition(current, next)) {
    throw new InvalidStateTransitionError(current, next);
  }
}
