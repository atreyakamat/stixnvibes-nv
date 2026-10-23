import { describe, expect, it } from "vitest";
import { orderNumber, priceLines } from "@/lib/orders";
import { MemoryStore } from "@/lib/store/memory";
import { demoProducts, seedOffers } from "@/lib/store/seed";
import { orderMessage, waLink } from "@/lib/whatsapp";

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
    const ok = priceLines([{ productId: music.id, qty: 1, selections: {}, custom: { song: "https://open.spotify.com/track/x", photo: id, for: "Riya" } }], products, offers);
    expect(ok.problems).toEqual([]);
    expect(ok.lines[0].custom).toEqual([
      { label: "Spotify song link", value: "https://open.spotify.com/track/x", kind: "link" },
      { label: "Your photo", value: `https://shop.stixnvibes.com/u/${id}`, kind: "image" },
      { label: "Dedicated to", value: "Riya", kind: "text" },
    ]);
  });

  it("rejects bad upload ids, unknown options and products that can't be ordered", () => {
    expect(priceLines([{ productId: music.id, qty: 1, selections: {}, custom: { song: "x", photo: "../etc" } }], products, offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: poster.id, qty: 1, selections: { size: "a0" }, custom: {} }], products, offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: "p-wall-cards", qty: 1, selections: {}, custom: {} }], products, offers).problems).toHaveLength(1);
    expect(priceLines([{ productId: "nope", qty: 1, selections: {}, custom: {} }], products, offers).problems).toHaveLength(1);
  });
});

describe("WhatsApp message", () => {
  it("lists items, options, offers and the ref", () => {
    const r = priceLines(
      [
        { productId: "p-lofi-01", qty: 4, selections: {}, custom: {} },
        { productId: "p-lofi-02", qty: 1, selections: {}, custom: {} },
      ],
      products,
      offers,
    );
    const text = orderMessage({ ...r, offers: r.applied, number: "SNV-ABC234", customerName: "Riya" });
    expect(text).toContain("1. Lo-fi 01 × 4 = ₹40");
    expect(text).toContain("   Material: Paper vinyl");
    expect(text).toContain("Buy 4 stickers, get 1 free: −₹10");
    expect(text).toContain("Total: ₹40");
    expect(text).toContain("Name: Riya");
    expect(text).toContain("Order ref: SNV-ABC234");
    expect(waLink("91 77440 20601", "hi")).toBe("https://wa.me/917744020601?text=hi");
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
    await store.createOrder({ number: "SNV-AAAAAA", customerName: "", customerNote: "", lines: r.lines, subtotalPaise: r.subtotalPaise, discountPaise: 0, totalPaise: r.totalPaise, offers: [] });
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
