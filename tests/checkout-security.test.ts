import { describe, it, expect } from "vitest";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { NextRequest } from "next/server";

describe("Checkout Server-Side Price & Input Security (SEC-003)", () => {
  it("overrides client-side price manipulation with server-verified prices", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: "line_1",
            productId: "s2",
            name: "Holographic Sticker",
            price_cents: 1, // Attacker manipulated price (₹0.01)
            quantity: 2,
          },
        ],
        shippingAddress: {
          name: "Test User",
          phone: "9876543210",
          address: "123 Test Street",
          pincode: "560001",
        },
      }),
    });

    const res = await checkoutHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Verified subtotal should use the catalog price (14900 * 2 = 29800), NOT 1 * 2 = 2
    expect(json.subtotalCents).toBeGreaterThan(100);
    expect(json.subtotalCents).toBe(29800);
  });

  it("sanitizes HTML tags in customer inputs", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: "line_1",
            productId: "s2",
            name: "Holographic Sticker",
            price_cents: 14900,
            quantity: 1,
          },
        ],
        shippingAddress: {
          name: "<script>alert('xss')</script>",
          phone: "9876543210",
          address: "<b>Street 123</b>",
          pincode: "560001",
          notes: "<iframe src='evil.com'></iframe>",
        },
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(200);
  });

  it("rejects invalid pincode formats", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: [{ id: "1", productId: "p1", name: "Sticker", price_cents: 100, quantity: 1 }],
        shippingAddress: {
          name: "User",
          phone: "9876543210",
          address: "Address",
          pincode: "123", // Invalid PIN
        },
      }),
    });

    const res = await checkoutHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("valid 6-digit Indian PIN code");
  });
});
