import type { Fulfilment, Order, OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  payment_review: "Checking payment",
  placed: "Order placed",
  paid: "Paid",
  packed: "Packed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  collected: "Collected",
  cancelled: "Cancelled",
};

/** What the customer sees under the status on their order page. */
export const STATUS_HELP: Record<OrderStatus, string> = {
  awaiting_payment: "Pay with UPI below, then send us the UPI reference number.",
  payment_review: "We got your UPI reference and are matching it with our bank. This usually takes a few hours.",
  placed: "Your order is in. Pay when you collect it.",
  paid: "Payment received. We'll pack your order next.",
  packed: "Your order is packed.",
  shipped: "On its way to you.",
  ready_for_pickup: "Ready. Collect it at the pickup point.",
  delivered: "Delivered. Stick it somewhere good.",
  collected: "Collected. Stick it somewhere good.",
  cancelled: "This order was cancelled.",
};

// Admin-driven transitions. The customer can only move awaiting_payment to
// payment_review, by submitting a UTR.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  payment_review: ["paid", "awaiting_payment", "cancelled"],
  placed: ["packed", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped", "ready_for_pickup", "cancelled"],
  shipped: ["delivered"],
  ready_for_pickup: ["collected", "cancelled"],
  delivered: [],
  collected: [],
  cancelled: [],
};

export function nextStatuses(order: Pick<Order, "status" | "fulfilment">): OrderStatus[] {
  return NEXT[order.status].filter((s) => {
    if (s === "shipped") return order.fulfilment === "ship";
    if (s === "ready_for_pickup") return order.fulfilment === "pickup";
    return true;
  });
}

export function canTransition(order: Pick<Order, "status" | "fulfilment">, to: OrderStatus): boolean {
  return nextStatuses(order).includes(to);
}

export function initialStatus(fulfilment: Fulfilment, paymentMethod: Order["paymentMethod"]): OrderStatus {
  if (paymentMethod === "upi") return "awaiting_payment";
  return fulfilment === "pickup" ? "placed" : "awaiting_payment";
}

/** Statuses that still hold stock and need someone to act. */
export const OPEN_STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "payment_review",
  "placed",
  "paid",
  "packed",
  "ready_for_pickup",
];

const UPI_PAID: OrderStatus[] = ["paid", "packed", "shipped", "ready_for_pickup", "delivered", "collected"];

/** Money actually in: UPI orders once verified, pay-at-pickup orders once collected. */
export function isPaid(order: Pick<Order, "status" | "paymentMethod">): boolean {
  return order.paymentMethod === "upi" ? UPI_PAID.includes(order.status) : order.status === "collected";
}

export const FINAL_STATUSES: OrderStatus[] = ["delivered", "collected", "cancelled"];
