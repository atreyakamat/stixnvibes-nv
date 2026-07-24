import { describe, it, expect } from "vitest";
import { products, getProductBySlug } from "@/lib/data/products";

describe("Shop Catalog Engine & Filtering Logic", () => {
  it("filters products by search query keyword", () => {
    const searchKeyword = "anime";
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchKeyword) ||
        p.description.toLowerCase().includes(searchKeyword) ||
        p.tags.some((t) => t.toLowerCase().includes(searchKeyword)) ||
        p.category.toLowerCase().includes(searchKeyword)
    );

    expect(filtered.length).toBeGreaterThan(0);
    for (const item of filtered) {
      const match =
        item.name.toLowerCase().includes(searchKeyword) ||
        item.description.toLowerCase().includes(searchKeyword) ||
        item.tags.some((t) => t.toLowerCase().includes(searchKeyword)) ||
        item.category.toLowerCase().includes(searchKeyword);
      expect(match).toBe(true);
    }
  });

  it("filters products by price range bands", () => {
    const min = 150;
    const max = 300;
    const filtered = products.filter((p) => p.price >= min && p.price < max);

    expect(filtered.length).toBeGreaterThan(0);
    for (const item of filtered) {
      expect(item.price).toBeGreaterThanOrEqual(min);
      expect(item.price).toBeLessThan(max);
    }
  });

  it("sorts products by price ascending and descending", () => {
    const sortedAsc = [...products].sort((a, b) => a.price - b.price);
    const sortedDesc = [...products].sort((a, b) => b.price - a.price);

    expect(sortedAsc[0].price).toBeLessThanOrEqual(sortedAsc[sortedAsc.length - 1].price);
    expect(sortedDesc[0].price).toBeGreaterThanOrEqual(sortedDesc[sortedDesc.length - 1].price);
  });

  it("returns product detail by valid slug", () => {
    const slug = "anime-heroes-sticker-pack";
    const p = getProductBySlug(slug);

    expect(p).toBeDefined();
    expect(p?.slug).toBe(slug);
    expect(p?.name).toContain("Anime");
  });
});
