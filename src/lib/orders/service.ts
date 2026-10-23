import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getStore, OutOfStockError } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";
import type { CheckoutInput } from "@/lib/validation";
import { normaliseUtr } from "@/lib/payments/upi";
import { canTransition, initialStatus } from "./status";
import { quoteCart, type QuoteProblem } from "./pricing";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public problems: QuoteProblem[] = [],
  ) {
    super(message);
  }
}

// No 0/O/1/I so numbers read cleanly over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newOrderNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SNV-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

export function newAccessToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
}

export function tokenMatches(order: Pick<Order, "accessToken">, token: string): boolean {
  const a = Buffer.from(order.accessToken);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createOrder(input: CheckoutInput): Promise<Order> {
  const store = getStore();
  const [settings, products] = await Promise.all([store.getSettings(), store.listProducts()]);

  if (!settings.storeOpen) throw new CheckoutError("Online orders aren't open yet. Message us on Instagram to order.");
  if (input.fulfilment === "ship" && !settings.shippingEnabled) throw new CheckoutError("Delivery isn't available right now.");
  if (input.fulfilment === "pickup" && !settings.pickupEnabled) throw new CheckoutError("Pickup isn't available right now.");
  if (input.paymentMethod === "upi" && !settings.upiEnabled) throw new CheckoutError("UPI payments aren't available right now.");
  if (input.paymentMethod === "pickup" && !settings.pickupEnabled) throw new CheckoutError("Pay at pickup isn't available right now.");

  const quote = quoteCart(input.lines, products, settings, input.fulfilment);
  if (quote.problems.length) throw new CheckoutError("Some items in your cart changed. Check your cart and try again.", quote.problems);
  if (quote.items.length === 0) throw new CheckoutError("Your cart is empty.");
  if (quote.belowMinimum) throw new CheckoutError("Your order is below the minimum order value.");

  const status = initialStatus(input.fulfilment, input.paymentMethod);
  const base = {
    accessToken: newAccessToken(),
    status,
    fulfilment: input.fulfilment,
    paymentMethod: input.paymentMethod,
    customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      ...(input.customer.email ? { email: input.customer.email } : {}),
      ...(input.customer.instagram ? { instagram: input.customer.instagram.replace(/^@/, "") } : {}),
    },
    address: input.fulfilment === "ship" && input.address ? input.address : null,
    notes: input.notes,
    items: quote.items,
    subtotalPaise: quote.subtotalPaise,
    shippingPaise: quote.shippingPaise,
    totalPaise: quote.totalPaise,
    utr: null,
    courier: null,
    trackingNumber: null,
    adminNote: "",
    events: [{ at: new Date().toISOString(), status, by: "customer" as const }],
  };

  // Order numbers are random; retry the rare collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await store.placeOrder({ ...base, number: newOrderNumber() });
    } catch (err) {
      if (err instanceof OutOfStockError) {
        throw new CheckoutError("Something in your cart just sold out.", [
          { productId: "", variantId: err.variantId, reason: "Sold out." },
        ]);
      }
      if (!/duplicate|unique|23505/i.test(String((err as Error).message))) throw err;
    }
  }
  throw new Error("Could not allocate an order number");
}

/** Customer says they've paid: attach the UTR and move to review. */
export async function submitUtr(number: string, token: string, rawUtr: string): Promise<Order> {
  const store = getStore();
  const order = await store.getOrderByNumber(number);
  if (!order || !tokenMatches(order, token)) throw new CheckoutError("Order not found.");
  if (order.paymentMethod !== "upi" || !["awaiting_payment", "payment_review"].includes(order.status)) {
    throw new CheckoutError("This order isn't waiting for a payment.");
  }
  const utr = normaliseUtr(rawUtr);
  if (!utr) throw new CheckoutError("UPI reference numbers are 12 digits. Check your UPI app's payment details.");
  try {
    return await store.updateOrder(number, {
      utr,
      status: "payment_review",
      event: { at: new Date().toISOString(), status: "payment_review", note: `UTR ${utr}`, by: "customer" },
    });
  } catch (err) {
    if (/already attached/.test((err as Error).message)) {
      throw new CheckoutError("That UPI reference was already used for another order.");
    }
    throw err;
  }
}

export async function findOrderForCustomer(number: string, phone: string): Promise<Order | null> {
  const order = await getStore().getOrderByNumber(number);
  return order && order.customer.phone === phone ? order : null;
}

export async function transitionOrder(number: string, to: OrderStatus, note?: string): Promise<Order> {
  const store = getStore();
  const order = await store.getOrderByNumber(number);
  if (!order) throw new Error("Order not found");
  if (!canTransition(order, to)) throw new Error(`Can't move an order from ${order.status} to ${to}.`);
  if (to === "cancelled") await store.restock(order.items);
  return store.updateOrder(number, {
    status: to,
    // Rejecting a UTR clears it so the customer can submit the right one.
    ...(order.status === "payment_review" && to === "awaiting_payment" ? { utr: null } : {}),
    event: { at: new Date().toISOString(), status: to, note: note?.trim() || undefined, by: "admin" },
  });
}
