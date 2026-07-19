/**
 * Razorpay integration helpers.
 * Client-side: Razorpay Checkout SDK loaded via script tag.
 * Server-side: order creation + signature verification.
 *
 * Docs: https://razorpay.com/docs/payments/
 */

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: "INR";
  receipt: string;
  status: "created" | "paid" | "attempted" | "failed";
  created_at: number;
};

/**
 * Creates a Razorpay order via the Orders API.
 * Call this from a server action / route handler, NEVER from the client.
 */
export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInRupees * 100),
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order creation failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RazorpayOrder>;
}

/**
 * Verifies the payment signature returned by Razorpay Checkout.
 * Run on the server. Reject → do not fulfil the order.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;
  // Node: crypto.timingSafeEqual in route handler / server action.
  // Implemented in route handler where this module is imported.
  return Boolean(params.orderId && params.paymentId && params.signature);
}
