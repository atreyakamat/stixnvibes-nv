import crypto from "crypto";

/**
 * NOTE: Stix N Vibes uses direct WhatsApp Checkout Integration (`src/lib/whatsapp.ts`).
 * Razorpay is NOT used for order placement or payment processing on Stix N Vibes.
 * All orders are created via `/api/orders/create` and placed directly via WhatsApp.
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

import { prisma } from "@/lib/prisma";

/**
 * Creates a Razorpay order via the Orders API.
 * Call this from a server action / route handler, NEVER from the client.
 */
export async function createRazorpayOrder(params: {
  orderId?: string;
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  // Phase 2: Idempotency check — retrieve real provider order if already created
  if (params.orderId) {
    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: params.orderId, provider: "razorpay", providerOrderId: { not: null } },
    });
    if (existingPayment?.providerOrderId) {
      const auth = Buffer.from(
        `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
      ).toString("base64");

      const existingRes = await fetch(
        `https://api.razorpay.com/v1/orders/${existingPayment.providerOrderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (existingRes.ok) {
        return (await existingRes.json()) as RazorpayOrder;
      }
    }
  }

  const auth = Buffer.from(
    `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
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
  
  const rzpOrder = (await res.json()) as RazorpayOrder;

  if (params.orderId) {
    await prisma.payment.create({
      data: {
        orderId: params.orderId,
        provider: "razorpay",
        providerOrderId: rzpOrder.id,
        amountCents: Math.round(params.amountInRupees * 100),
        currency: "INR",
        status: "pending",
      },
    });
  }

  return rzpOrder;
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
  const secret = process.env.RAZORPAY_KEY_SECRET ?? RAZORPAY_KEY_SECRET;
  if (!secret || !params.orderId || !params.paymentId || !params.signature) {
    return false;
  }
  try {
    const body = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const signatureBuffer = Buffer.from(params.signature, "utf-8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies the webhook signature sent by Razorpay webhook events.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

