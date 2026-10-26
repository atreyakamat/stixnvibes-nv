import "server-only";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { notifyPayment } from "@/lib/notify";
import { awaitingPayment, setOrderStatus } from "@/lib/orders";
import { getStore } from "@/lib/store";
import type { YoupiWebhook } from "@/lib/youpi";

export type PaymentOutcome = "paid" | "ignored" | "unknown-order" | "already-paid" | "mismatch";

/**
 * Applies a verified YouPI webhook. Only a successful UPI payment of exactly
 * the order total, on an order still waiting for payment, marks it paid.
 * Anything odd is left alone and emailed to the owner to check by hand.
 */
export async function applyYoupiWebhook(e: YoupiWebhook): Promise<PaymentOutcome> {
  if (e.event !== "SUCCESS") return "ignored";
  const number = e.orderId.toUpperCase();
  if (!ORDER_NUMBER_RE.test(number)) return "unknown-order";
  const store = getStore();
  const order = await store.getOrder(number);
  if (!order) return "unknown-order";

  const ref = { utr: e.utr, paymentId: e.paymentId, amountPaise: e.amountPaise };
  if (!awaitingPayment(order)) {
    // Webhooks are retried, so the same payment arriving twice is normal.
    if (order.adminNote.includes(e.paymentId)) return "already-paid";
    await notifyPayment(order, ref, `A second payment arrived for an order that is already ${order.status}.`);
    return "already-paid";
  }
  if (e.currency !== "INR" || e.method !== "UPI" || e.amountPaise !== order.totalPaise) {
    await notifyPayment(order, ref, `YouPI reports ${formatINR(e.amountPaise)} by ${e.method}, but the order total is ${formatINR(order.totalPaise)}. It was not marked paid.`);
    return "mismatch";
  }

  const line = `Paid online via YouPI on ${new Date().toISOString().slice(0, 10)}. UTR ${e.utr || "not given"}, payment ${e.paymentId}.`;
  const updated = await setOrderStatus(number, "paid", order.adminNote ? `${order.adminNote}\n${line}` : line);
  await notifyPayment(updated, ref);
  return "paid";
}
