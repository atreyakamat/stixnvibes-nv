import { describe, expect, it } from "vitest";
import { customersFromOrders, customerTag } from "@/lib/customers";
import { orderNumber, priceLines, viewKeyMatches } from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { MemoryStore } from "@/lib/store/memory";
import { demoProducts, seedOffers } from "@/lib/store/seed";
import type { Order } from "@/lib/types";
import { upiLink } from "@/lib/upi";
import { orderSchema } from "@/lib/validation";
import { cleanHandle, dmLink, orderMessage } from "@/lib/instagram";

const details = {
  viewKey: "k".repeat(22),
  customerName: "Riya",
  customerPhone: "9876543210",
  fulfilment: "delivery" as const,
  address: { line: "12 Rua de Ourem, Fontainhas", city: "Panaji", state: "Goa", pincode: "403001" },
  customerNote: "",
  couponCode: "",
  source: "",
  instagram: "",
};

const products = demoProducts();
const offers = seedOffers();
const music = products.find((p) => p.type === "music-card")!;
const poster = products.find((p) => p.type === "poster")!;

describe("priceLines", () => {
  it("prices from the catalog, not the browser", () => {
    const r = priceLines([{ productId: "p-lofi-01", qty: 5, selections: { material: "waterproof" }, custom: {} }], products, offers);
    expect(r.problems).toEqual([]);
    expect(r.lines[0]).toMatchObject({ name: "Lo-fi 01", options: ["Material: Waterproof"], unitPricePaise: 1000, lineTotalPaise: 5000 });
    expect(r.totalPaise).toBe(4000);
  });

  it("requires required custom fields and turns photos into links", () => {
    const missing = priceLines([{ productId: music.id, qty: 1, selections: {}, custom: {} }], products, offers);
    expect(missing.problems[0].reason).toMatch(/Spotify song link/);

    const id = "a".repeat(32);
    const ok = priceLines([{ productId: music.id, qty: 5, selections: {}, custom: { song: "https://open.spotify.com/track/x", photo: id, for: "Riya" } }], products, offers);
    expect(ok.problems).toEqual([]);
    expect(ok.lines[0].custom).toEqual([
      { label: "Spotify song link", value: "https://open.spotify.com/track/x", kind: "link" },
      { label: "Your photo", value: `https://shop.stixnvibes.com/u/${id}`, kind: "image" },
      { label: "Dedicated to", value: "Riya", kind: "text" },
    ]);
  });

  it("rejects bad upload ids, unknown options and products that can't be ordered", () => {
    expect(priceLines([{ productId: music.id, qty: 5, selections: {}, custom: { song: "https://open.spotify.com/track/x", photo: "../etc" } }], products, offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: music.id, qty: 3, selections: {}, custom: { song: "https://open.spotify.com/track/x" } }], products, offers).problems[0].reason).toMatch(/minimum is 5/);
    expect(priceLines([{ productId: poster.id, qty: 1, selections: { size: "a0" }, custom: {} }], products, offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: "p-wall-cards", qty: 1, selections: {}, custom: {} }], [{ ...products.find((p) => p.id === "p-wall-cards")!, status: "upcoming" }], offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: "nope", qty: 1, selections: {}, custom: {} }], products, offers).problems).toHaveLength(1);
  });
});

describe("order message", () => {
  it("lists items, options, offers and the ref", () => {
    const r = priceLines(
      [
        { productId: "p-lofi-01", qty: 4, selections: {}, custom: {} },
        { productId: "p-lofi-02", qty: 1, selections: {}, custom: {} },
      ],
      products,
      offers,
    );
    const text = orderMessage({ ...r, offers: r.applied, number: "SNV-ABC234", customerName: "Riya", freeShippingAbovePaise: 25000 });
    expect(text).toContain("1. Lo-fi 01 × 4 = ₹40");
    expect(text).toContain("   Material: Paper vinyl");
    expect(text).toContain("Buy 4 stickers, get 1 free: −₹10");
    expect(text).toContain("Total: ₹40");
    expect(text).toContain("Shipping: please share the charge for my area");
    expect(text).toContain("Name: Riya");
    expect(text).toContain("Order ref: SNV-ABC234");
  });

  it("opens the Instagram DM with the shop, whatever the handle looks like", () => {
    expect(dmLink("stixnvibes")).toBe("https://ig.me/m/stixnvibes");
    expect(cleanHandle("@stix.n_vibes")).toBe("stix.n_vibes");
    expect(cleanHandle("https://www.instagram.com/stixnvibes/?hl=en")).toBe("stixnvibes");
    expect(cleanHandle("https://ig.me/m/stixnvibes")).toBe("stixnvibes");
    // Anything that isn't a username falls back to the shop's account.
    expect(dmLink("javascript:alert(1)")).toBe("https://ig.me/m/stixnvibes");
    expect(dmLink("")).toBe("https://ig.me/m/stixnvibes");
  });

  it("makes readable order refs", () => {
    for (let i = 0; i < 50; i++) expect(orderNumber()).toMatch(/^SNV-[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe("memory store stats", () => {
  it("counts views, taps and orders", async () => {
    const store = new MemoryStore();
    await store.track([
      { type: "view", productId: "p-lofi-01", path: "/shop/lofi-01" },
      { type: "view", productId: "p-lofi-01", path: "/shop/lofi-01" },
      { type: "add_to_cart", productId: "p-lofi-01", path: "/shop/lofi-01" },
      { type: "order_click", productId: null, path: "/cart" },
    ]);
    const r = priceLines([{ productId: "p-lofi-01", qty: 3, selections: {}, custom: {} }], await store.listProducts(), offers);
    await store.createOrder({ ...details, number: "SNV-AAAAAA", lines: r.lines, subtotalPaise: r.subtotalPaise, discountPaise: 0, totalPaise: r.totalPaise, offers: [] });
    const s = await store.stats(new Date(Date.now() - 86400000).toISOString());
    expect(s).toMatchObject({ views: 2, addToCart: 1, orderClicks: 1, orders: 1, orderValuePaise: 3000 });
    expect(s.topViewed[0]).toEqual({ productId: "p-lofi-01", count: 2 });
    expect(s.topOrdered[0]).toEqual({ productId: "p-lofi-01", qty: 3 });
  });

  it("drops a deleted collection from its products", async () => {
    const store = new MemoryStore();
    await store.deleteCollection("c-lofi");
    expect((await store.listProducts()).some((p) => p.collectionIds.includes("c-lofi"))).toBe(false);
  });
});

describe("checkout details", () => {
  const base = { lines: [{ productId: "p-lofi-01", qty: 1 }], customerName: "Riya" };

  it("cleans up Indian mobile numbers", () => {
    for (const p of ["9876543210", "+91 98765 43210", "098765-43210", "919876543210"]) expect(normalizePhone(p)).toBe("9876543210");
    for (const p of ["12345", "5876543210", "98765432101"]) expect(normalizePhone(p)).toBeNull();
  });

  it("needs an address for delivery but not for pickup", () => {
    const delivery = orderSchema.safeParse({ ...base, customerPhone: "98765 43210", fulfilment: "delivery", address: { line: "x", city: "", state: "", pincode: "12" } });
    expect(delivery.success).toBe(false);
    expect(delivery.error?.issues.map((i) => i.path.join("."))).toEqual(["address.line", "address.city", "address.pincode"]);

    const pickup = orderSchema.safeParse({ ...base, customerPhone: "+919876543210", fulfilment: "pickup", address: { line: "ignored", city: "x", state: "", pincode: "" } });
    expect(pickup.success).toBe(true);
    expect(pickup.data).toMatchObject({ customerPhone: "9876543210", fulfilment: "pickup", address: { line: "", city: "", state: "", pincode: "" } });
  });

  it("rejects a missing name or phone", () => {
    expect(orderSchema.safeParse({ ...base, customerName: "", customerPhone: "9876543210", fulfilment: "pickup" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, customerPhone: "123", fulfilment: "pickup" }).success).toBe(false);
  });

  it("puts the details and the order page in the WhatsApp message", () => {
    const text = orderMessage({ lines: [], subtotalPaise: 1000, discountPaise: 0, totalPaise: 1000, offers: [], ...details, number: "SNV-ABC234", link: "https://shop.stixnvibes.com/order/SNV-ABC234?k=x" });
    expect(text).toContain("Phone: 98765 43210");
    expect(text).toContain("Deliver to: 12 Rua de Ourem, Fontainhas, Panaji, Goa 403001");
    expect(text).toContain("Order page: https://shop.stixnvibes.com/order/SNV-ABC234?k=x");
    const pickup = orderMessage({ lines: [], subtotalPaise: 1000, discountPaise: 0, totalPaise: 1000, offers: [], ...details, fulfilment: "pickup", freeShippingAbovePaise: 25000 });
    expect(pickup).toContain("Pickup: at your next stall");
    expect(pickup).not.toContain("Shipping");
  });

  it("checks the order page key", () => {
    expect(viewKeyMatches({ viewKey: "abc" }, "abc")).toBe(true);
    expect(viewKeyMatches({ viewKey: "abc" }, "abd")).toBe(false);
    expect(viewKeyMatches({ viewKey: "abc" }, undefined)).toBe(false);
    expect(viewKeyMatches({ viewKey: "" }, "")).toBe(false);
  });

  it("builds UPI links with or without an amount", () => {
    expect(upiLink({ upiId: "snv@okicici", name: "Stix N Vibes", amountPaise: 4500, note: "Stix N Vibes SNV-ABC234" })).toBe(
      "upi://pay?pa=snv%40okicici&pn=Stix%20N%20Vibes&cu=INR&tn=Stix%20N%20Vibes%20SNV-ABC234&am=45.00",
    );
    expect(upiLink({ upiId: "snv@okicici", name: "S", amountPaise: null, note: "x" })).not.toContain("am=");
  });
});

describe("customers", () => {
  const order = (o: Partial<Order>): Order => ({
    id: Math.random().toString(),
    number: "SNV-AAAAAA",
    status: "new",
    adminNote: "",
    lines: [],
    subtotalPaise: 0,
    discountPaise: 0,
    totalPaise: 1000,
    offers: [],
    stockTaken: false,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...details,
    ...o,
  });

  it("groups orders by phone and keeps the latest name and address", () => {
    const list = customersFromOrders([
      order({ createdAt: "2026-10-03T00:00:00Z", customerName: "Riya K", totalPaise: 3000, status: "paid", fulfilment: "pickup", address: { line: "", city: "", state: "", pincode: "" } }),
      order({ createdAt: "2026-10-01T00:00:00Z", totalPaise: 2000, status: "cancelled" }),
      order({ customerPhone: "9123456789", customerName: "Arjun" }),
      order({ customerPhone: "", customerName: "Old order" }),
    ]);
    expect(list).toHaveLength(2);
    const riya = list.find((c) => c.phone === "9876543210")!;
    expect(riya).toMatchObject({ name: "Riya K", orders: 2, spentPaise: 3000, paidOrders: 1, pickups: 1, firstAt: "2026-10-01T00:00:00Z", lastAt: "2026-10-03T00:00:00Z" });
    expect(riya.address?.city).toBe("Panaji");
    expect(customerTag(riya)).toBe("Repeat");
  });
});
