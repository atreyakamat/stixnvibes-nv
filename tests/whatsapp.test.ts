/**
 * Unit tests for the WhatsApp checkout URL builder.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Stub env before importing the module under test.
beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "917744020601";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  vi.doUnmock("@/lib/whatsapp");
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me deep-link URL with the business number", async () => {
    const { buildWhatsAppUrl } = await import("@/lib/whatsapp");
    const url = buildWhatsAppUrl({
      name: "Aarav Mehta",
      address: "12 MG Road, Bengaluru",
      pincode: "560001",
      phone: "+91 90000 00000",
      items: [
        { id: "s1", productId: "s1", name: "Anime Pack", price_cents: 19900, quantity: 2 },
      ],
      totalRupees: 398,
    });
    expect(url).toContain("https://wa.me/917744020601?text=");
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toContain("Aarav Mehta");
    expect(decoded).toContain("Anime Pack ×2");
    expect(decoded).toContain("₹398");
    expect(decoded).toContain("560001");
  });

  it("includes variant names when present", async () => {
    const { buildWhatsAppUrl } = await import("@/lib/whatsapp");
    const url = buildWhatsAppUrl({
      name: "Ishita Rao",
      address: "Indiranagar, Bengaluru",
      pincode: "560038",
      phone: "+918000000000",
      items: [
        { id: "sc1", productId: "sc1", name: "Custom Spotify Card", price_cents: 29900, quantity: 1, variantName: "A4 · Matte" },
      ],
      totalRupees: 299,
    });
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toContain("Custom Spotify Card (A4 · Matte) ×1");
  });

  it("includes notes when provided", async () => {
    const { buildWhatsAppUrl } = await import("@/lib/whatsapp");
    const url = buildWhatsAppUrl({
      name: "Rohan Verma",
      address: "Connaught Place, New Delhi",
      pincode: "110001",
      phone: "+919000000000",
      items: [{ id: "m1", productId: "m1", name: "Mystery Pack", price_cents: 29900, quantity: 1 }],
      totalRupees: 299,
      notes: "Gift wrap please",
    });
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toContain("Notes:");
    expect(decoded).toContain("Gift wrap please");
  });

  it("throws when the WhatsApp number env is missing", async () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    const { buildWhatsAppUrl } = await import("@/lib/whatsapp");
    expect(() =>
      buildWhatsAppUrl({
        name: "X",
        address: "X",
        pincode: "X",
        phone: "X",
        items: [{ id: "i1", productId: "i1", name: "Y", price_cents: 100, quantity: 1 }],
        totalRupees: 1,
      })
    ).toThrowError(/WhatsApp number not configured/);
  });

  it("isWhatsAppConfigured reflects env configuration state", async () => {
    const { isWhatsAppConfigured } = await import("@/lib/whatsapp");
    expect(isWhatsAppConfigured()).toBe(true);
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    vi.resetModules();
    const { isWhatsAppConfigured: notConfigured } = await import("@/lib/whatsapp");
    expect(notConfigured()).toBe(false);
  });
});
