import { describe, expect, it } from "vitest";
import { absolute, appCatalog, appOrder } from "@/lib/app-api";
import { DEMO_SETTINGS, demoColleges, demoGallery, demoPosts, demoProducts, seedCollections, seedOffers } from "@/lib/store/seed";
import type { Order, Settings } from "@/lib/types";

const settings: Settings = { ...DEMO_SETTINGS, upiId: "stix@okicici", upiName: "Stix", whatsappNumber: "9876543210", goalPaise: 30_000_000, unitCosts: { sticker: 500 } };

describe("app catalogue", () => {
  const products = demoProducts();
  products[0] = { ...products[0], status: "hidden", costPaise: 400 };
  const cat = appCatalog({
    products,
    collections: seedCollections(),
    offers: seedOffers(),
    settings,
    colleges: demoColleges(),
    stalls: [],
    posts: demoPosts(),
    gallery: demoGallery(),
  });

  it("leaves out hidden products and every private field", () => {
    expect(cat.products.some((p) => p.id === products[0].id)).toBe(false);
    const text = JSON.stringify(cat);
    for (const secret of ["costPaise", "lowStockAt", "unitCosts", "goalPaise", "upiId", "whatsappNumber", "stix@okicici"]) expect(text).not.toContain(secret);
  });

  it("makes image links absolute", () => {
    expect(absolute("/images/a.png")).toMatch(/^https?:\/\/[^/]+\/images\/a\.png$/);
    expect(absolute("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    for (const p of cat.products) for (const img of p.images) expect(img.startsWith("/")).toBe(false);
  });

  it("only sends published posts and visible photos", () => {
    expect(cat.posts.every((p) => p.status === "published")).toBe(true);
    expect(cat.gallery.every((g) => g.visible)).toBe(true);
  });
});

describe("app order", () => {
  const order: Order = {
    id: "o1",
    number: "SNV-ABCDEF",
    viewKey: "secret-key",
    status: "confirmed",
    customerName: "Meera",
    customerPhone: "9876543210",
    fulfilment: "pickup",
    address: { line: "", city: "", state: "", pincode: "" },
    customerNote: "",
    lines: [],
    subtotalPaise: 12000,
    discountPaise: 0,
    totalPaise: 12000,
    offers: [],
    adminNote: "regular, owes 20",
    couponCode: "",
    source: "app",
    instagram: "",
    stockTaken: true,
    trackingNumber: "",
    createdAt: "2026-10-27T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  };

  it("hides the admin note and key fields, and gives a UPI link with the amount", () => {
    const o = appOrder(order, "secret-key", settings, false);
    expect(o).not.toHaveProperty("adminNote");
    expect(o).not.toHaveProperty("viewKey");
    expect(o).not.toHaveProperty("id");
    expect(o.pay?.upiLink).toContain("am=120.00");
    expect(o.pay?.upiLink).toMatch(/^upi:\/\/pay\?pa=stix%40okicici/);
    expect(o.pay?.online).toBe(false);
    expect(o.orderUrl).toContain("/order/SNV-ABCDEF?k=secret-key");
  });

  it("asks for nothing once paid", () => {
    expect(appOrder({ ...order, status: "paid" }, "secret-key", settings, true).pay).toBeNull();
  });
});
