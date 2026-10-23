import { describe, expect, it } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/money";
import { canTransition, initialStatus, isPaid, nextStatuses } from "@/lib/orders/status";
import { buildUpiLink, isValidVpa, normaliseUtr } from "@/lib/payments/upi";
import { checkoutSchema, normalisePhone, trackSchema } from "@/lib/validation";

describe("order status", () => {
  it("starts UPI orders awaiting payment and pickup orders as placed", () => {
    expect(initialStatus("ship", "upi")).toBe("awaiting_payment");
    expect(initialStatus("pickup", "upi")).toBe("awaiting_payment");
    expect(initialStatus("pickup", "pickup")).toBe("placed");
  });

  it("only offers shipping steps for shipped orders and pickup steps for pickups", () => {
    expect(nextStatuses({ status: "packed", fulfilment: "ship" })).toEqual(["shipped", "cancelled"]);
    expect(nextStatuses({ status: "packed", fulfilment: "pickup" })).toEqual(["ready_for_pickup", "cancelled"]);
    expect(canTransition({ status: "delivered", fulfilment: "ship" }, "cancelled")).toBe(false);
    expect(canTransition({ status: "awaiting_payment", fulfilment: "ship" }, "shipped")).toBe(false);
  });

  it("counts money only when it is actually in", () => {
    expect(isPaid({ status: "payment_review", paymentMethod: "upi" })).toBe(false);
    expect(isPaid({ status: "paid", paymentMethod: "upi" })).toBe(true);
    expect(isPaid({ status: "packed", paymentMethod: "pickup" })).toBe(false);
    expect(isPaid({ status: "collected", paymentMethod: "pickup" })).toBe(true);
    expect(isPaid({ status: "cancelled", paymentMethod: "upi" })).toBe(false);
  });
});

describe("UPI", () => {
  it("builds a deep link with exact amount and order number", () => {
    const link = buildUpiLink({ vpa: "stix@okaxis", payee: "Stix N Vibes", amountPaise: 14950, orderNumber: "SNV-ABC234" });
    expect(link).toBe("upi://pay?pa=stix%40okaxis&pn=Stix%20N%20Vibes&am=149.50&cu=INR&tn=Stix%20N%20Vibes%20SNV-ABC234&tr=SNV-ABC234");
  });

  it("validates UPI IDs and amounts", () => {
    expect(isValidVpa("stixnvibes@okaxis")).toBe(true);
    expect(isValidVpa("not a vpa")).toBe(false);
    expect(() => buildUpiLink({ vpa: "x@y", payee: "", amountPaise: 0, orderNumber: "SNV-AAAAAA" })).toThrow();
  });

  it("normalises UTRs", () => {
    expect(normaliseUtr(" 4123 4567 8901 ")).toBe("412345678901");
    expect(normaliseUtr("12345")).toBeNull();
    expect(normaliseUtr("<script>")).toBeNull();
  });
});

describe("money", () => {
  it("parses and formats rupees", () => {
    expect(rupeesToPaise("149")).toBe(14900);
    expect(rupeesToPaise("1,299.5")).toBe(129950);
    expect(rupeesToPaise("")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNaN();
    expect(paiseToRupees(14950)).toBe("149.50");
    expect(paiseToRupees(null)).toBe("");
    expect(formatINR(14900)).toBe("₹149");
  });
});

describe("validation", () => {
  it("normalises Indian mobile numbers", () => {
    expect(normalisePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalisePhone("09876543210")).toBe("9876543210");
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("5876543210")).toBeNull();
  });

  const base = {
    lines: [{ productId: "p", variantId: "v", qty: 1 }],
    customer: { name: "Asha", phone: "9876543210" },
  };

  it("needs an address for shipped orders", () => {
    const r = checkoutSchema.safeParse({ ...base, fulfilment: "ship", paymentMethod: "upi" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["address"]);
  });

  it("only allows pay-at-pickup with pickup", () => {
    const r = checkoutSchema.safeParse({
      ...base,
      fulfilment: "ship",
      paymentMethod: "pickup",
      address: { line1: "House 1", city: "Panaji", state: "Goa", pincode: "403001" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects bots that fill the honeypot", () => {
    expect(checkoutSchema.safeParse({ ...base, fulfilment: "pickup", paymentMethod: "pickup", company: "spam" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfilment: "pickup", paymentMethod: "pickup" }).success).toBe(true);
  });

  it("validates tracking lookups", () => {
    expect(trackSchema.safeParse({ number: "snv-abc234", phone: "9876543210" }).success).toBe(true);
    expect(trackSchema.safeParse({ number: "123", phone: "9876543210" }).success).toBe(false);
  });
});
