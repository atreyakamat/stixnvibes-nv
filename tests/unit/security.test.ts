import { describe, expect, it } from "vitest";
import { priceLines, webLink } from "@/lib/orders";
import { demoProducts, seedOffers } from "@/lib/store/seed";
import { isImage } from "@/lib/upload-check";

// Attacks found in the security review (2026-10-25); each must stay closed.

const products = demoProducts();
const offers = seedOffers();
const music = products.find((p) => p.type === "music-card")!;
const card = (song: string) => priceLines([{ productId: music.id, qty: 5, selections: {}, custom: { song } }], products, offers);

describe("link fields only take web links", () => {
  it.each(["javascript:alert(document.cookie)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "open.spotify.com/track/abc", "not a link"])(
    "rejects %s",
    (song) => {
      expect(webLink(song)).toBeNull();
      expect(card(song).problems[0]?.reason).toContain("needs a link starting with https://");
    },
  );
  it("keeps a real Spotify link", () => {
    const r = card("https://open.spotify.com/track/abc?si=1");
    expect(r.problems).toEqual([]);
    expect(r.lines[0].custom[0]).toMatchObject({ kind: "link", value: "https://open.spotify.com/track/abc?si=1" });
  });
});

describe("uploads must really be images", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)]);
  it("accepts real PNG, JPEG and WebP headers", () => {
    expect(isImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png")).toBe(true);
    expect(isImage(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
    expect(isImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]), "image/webp")).toBe(true);
  });
  it("rejects HTML or a script renamed to .png", () => {
    expect(isImage(new TextEncoder().encode("<html><script>"), "image/png")).toBe(false);
    expect(isImage(bytes(0xff, 0xd8, 0xff), "image/png")).toBe(false);
    expect(isImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/svg+xml")).toBe(false);
  });
});

describe("prices can't be set by the browser", () => {
  it("ignores price, total and discount fields sent with the cart", () => {
    const line = { productId: "p-lofi-01", qty: 4, selections: {}, custom: {}, unitPricePaise: 1, lineTotalPaise: 1 } as never;
    const r = priceLines([line], products, offers);
    expect(r.lines[0].unitPricePaise).toBe(1000);
    expect(r.totalPaise).toBe(4000);
  });
  it("can't price an option that doesn't exist", () => {
    const r = priceLines([{ productId: "p-lofi-01", qty: 1, selections: { material: "free" }, custom: {} }], products, offers);
    expect(r.problems).toHaveLength(1);
  });
});
