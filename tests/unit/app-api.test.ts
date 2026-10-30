import { describe, expect, it } from "vitest";
import { absolute, appCatalog, appOrder, publicReview } from "@/lib/app-api";
import { DEMO_SETTINGS, demoColleges, demoGallery, demoPosts, demoProducts, seedCollections, seedOffers } from "@/lib/store/seed";
import type { Order, Review, Settings } from "@/lib/types";

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

describe("public reviews", () => {
  const review = (over: Partial<Review>): Review => ({ id: "r1", productId: "p-lofi-01", orderNumber: "SNV-ABC123", name: "Ria", instagram: "ria.r", rating: 5, text: "Love it", photos: ["a".repeat(32)], status: "published", reply: "", repliedAt: null, createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-10-30T00:00:00Z", ...over });

  it("drops order number and Instagram, links photos, flags verified buyers", () => {
    const r = publicReview(review({}));
    expect(r).not.toHaveProperty("orderNumber");
    expect(r).not.toHaveProperty("instagram");
    expect(r.verified).toBe(true);
    expect(r.photos[0]).toMatch(/\/u\/a{32}$/);
    expect(publicReview(review({ orderNumber: null })).verified).toBe(false);
  });

  it("only sends published reviews of products the app shows", () => {
    const products = demoProducts();
    const hidden = { ...products[1]!, status: "hidden" as const };
    const cat = appCatalog({
      products: [products[0]!, hidden],
      collections: [],
      offers: [],
      settings,
      colleges: [],
      stalls: [],
      posts: [],
      gallery: [],
      reviews: [review({ id: "a", productId: products[0]!.id }), review({ id: "b", productId: products[0]!.id, status: "pending" }), review({ id: "c", productId: hidden.id })],
    });
    expect(cat.reviews.map((r) => r.id)).toEqual(["a"]);
  });
});
