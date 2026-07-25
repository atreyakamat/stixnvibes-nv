import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/payment/razorpay";
import crypto from "crypto";

describe("Payment & Webhook Security Verification (SEC-002)", () => {
  const secret = "test_razorpay_secret_key_12345";
  const originalEnv = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = secret;
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_67890";
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalEnv;
  });

  it("validates authentic Razorpay payment signatures", () => {
    const orderId = "order_N123456789";
    const paymentId = "pay_P987654321";
    const body = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const result = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
    });

    expect(result).toBe(true);
  });

  it("rejects forged or modified payment signatures", () => {
    const orderId = "order_N123456789";
    const paymentId = "pay_P987654321";
    const forgedSignature = "fake_signature_hash_1234567890abcdef";

    const result = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: forgedSignature,
    });

    expect(result).toBe(false);
  });

  it("rejects signatures when secret is missing or parameters are empty", () => {
    delete process.env.RAZORPAY_KEY_SECRET;

    const result = verifyPaymentSignature({
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "abc",
    });

    expect(result).toBe(false);
  });

  it("validates authentic Razorpay webhook signatures", () => {
    const payload = JSON.stringify({ event: "order.paid", order_id: "order_123" });
    const validSignature = crypto
      .createHmac("sha256", "test_webhook_secret_67890")
      .update(payload)
      .digest("hex");

    const result = verifyWebhookSignature(payload, validSignature);
    expect(result).toBe(true);
  });
});
