import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as webhookHandler } from "@/app/api/payments/webhook/route";
import crypto from "crypto";
import { randomUUID } from "crypto";

describe("Gate 6 & 7: Payment Idempotency & Adversarial Webhook Forensics", () => {
  const webhookSecret = "test_webhook_secret_123456";
  let testOrderId: string;
  let testPaymentId: string;
  let testProviderOrderId: string;
  const orderAmountCents = 49900; // ₹499.00

  function signPayload(body: string): string {
    return crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  }

  beforeEach(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    testOrderId = randomUUID();
    testProviderOrderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create a confirmed order in DB
    await prisma.order.create({
      data: {
        id: testOrderId,
        customerName: "Payment Test User",
        customerPhone: "+919876543210",
        address: "789 Brigade Road",
        pincode: "560025",
        totalCents: orderAmountCents,
        status: "confirmed",
      },
    });

    // Create an active reservation for this order
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        name: "Webhook Product",
        slug: `webhook-prod-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: orderAmountCents,
        stock: 10,
        type: "sticker",
      },
    });

    await prisma.inventoryReservation.create({
      data: {
        id: randomUUID(),
        productId: product.id,
        orderId: testOrderId,
        quantity: 1,
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Create corresponding pending payment record
    const payment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        orderId: testOrderId,
        provider: "razorpay",
        providerOrderId: testProviderOrderId,
        amountCents: orderAmountCents,
        currency: "INR",
        status: "pending",
      },
    });
    testPaymentId = payment.id;
  });

  afterAll(async () => {
    try {
      await prisma.paymentWebhookEvent.deleteMany({});
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.inventoryReservation.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    } catch (e) {}
  });

  it("Valid payment.captured: Updates payment to paid, transitions order to paid, and commits reservation", async () => {
    const eventId = `evt_valid_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_capture_123",
            order_id: testProviderOrderId,
            amount: orderAmountCents,
            status: "captured",
          },
        },
      },
    };

    const payload = JSON.stringify(payloadObj);
    const signature = signPayload(payload);

    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);

    // Invariant 1: Payment record updated to paid
    const updatedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(updatedPayment?.status).toBe("paid");
    expect(updatedPayment?.providerPaymentId).toBe("pay_test_capture_123");

    // Invariant 2: Order status transitioned to paid
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(updatedOrder?.status).toBe("paid");

    // Invariant 3: Reservation is committed
    const reservations = await prisma.inventoryReservation.findMany({
      where: { orderId: testOrderId },
    });
    expect(reservations[0].status).toBe("committed");
  });

  it("Duplicate Webhooks (Idempotency Proof): Replaying the same webhook 10 times causes EXACTLY ONE state transition", async () => {
    const eventId = `evt_idempotent_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_idempotent_456",
            order_id: testProviderOrderId,
            amount: orderAmountCents,
            status: "captured",
          },
        },
      },
    };

    const payload = JSON.stringify(payloadObj);
    const signature = signPayload(payload);

    // Replay 10 identical webhook requests
    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(200);
    }

    // Invariant 1: Exactly 1 webhook event record stored for this event ID
    const events = await prisma.paymentWebhookEvent.findMany({
      where: { eventId },
    });
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("processed");

    // Invariant 2: Order is paid
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("paid");
  });

  it("Signature Forgery Rejected: Invalid or missing x-razorpay-signature returns 400 Bad Request", async () => {
    const payload = JSON.stringify({
      id: `evt_forged_${Date.now()}`,
      event: "payment.captured",
    });

    // 1. Missing signature
    const reqNoSig = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      body: payload,
    });
    const resNoSig = await webhookHandler(reqNoSig);
    expect(resNoSig.status).toBe(400);

    // 2. Tampered signature
    const reqBadSig = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": "bad_signature_digest",
      },
      body: payload,
    });
    const resBadSig = await webhookHandler(reqBadSig);
    expect(resBadSig.status).toBe(400);
  });

  it("Amount Mismatch Anomaly: Webhook reporting incorrect amount is rejected and does not mark order paid", async () => {
    const eventId = `evt_mismatch_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_mismatch_999",
            order_id: testProviderOrderId,
            amount: 100, // 1 Rupee instead of 499 Rupees (orderAmountCents)
            status: "captured",
          },
        },
      },
    };

    const payload = JSON.stringify(payloadObj);
    const signature = signPayload(payload);

    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(400);

    // Invariant: Order status remains confirmed, NOT paid
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("confirmed");
  });

  it("payment.failed: Correctly updates payment failure reason and transitions order to payment_failed", async () => {
    const eventId = `evt_failed_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      entity: "event",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_000",
            order_id: testProviderOrderId,
            error_description: "Card declined by bank",
          },
        },
      },
    };

    const payload = JSON.stringify(payloadObj);
    const signature = signPayload(payload);

    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);

    // Invariant 1: Payment record updated to failed
    const payment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
    expect(payment?.status).toBe("failed");
    expect(payment?.failureReason).toBe("Card declined by bank");

    // Invariant 2: Order status transitioned to payment_failed
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("payment_failed");
  });
});
