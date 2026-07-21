/**
 * Test scaffolding + homepage-section test that mock data exports remain
 * consistent with the catalogue interface.
 */
import { describe, it, expect } from "vitest";
import {
  products,
  getBestSellers,
  getNewArrivals,
  getProductBySlug,
  getProductsByCategory,
  featuredCategories,
  trendingCollections,
  reviews,
} from "@/lib/data/products";

describe("product catalog", () => {
  it("has > 0 products", () => {
    expect(products.length).toBeGreaterThan(10);
  });

  it("every product has a slug, name, price >= 0, and currency INR", () => {
    for (const p of products) {
      expect(typeof p.slug).toBe("string");
      expect(p.slug.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThanOrEqual(0);
      expect(p.currency).toBe("INR");
    }
  });

  it("getProductBySlug returns a single match", () => {
    const first = products.at(0);
    expect(first).toBeTruthy();
    const found = getProductBySlug(first!.slug);
    expect(found?.id).toBe(first!.id);
  });

  it("getBestSellers returns items tagged 'bestseller'", () => {
    const bs = getBestSellers();
    expect(bs.length).toBeGreaterThan(0);
    for (const p of bs) expect(p.tags).toContain("bestseller");
  });

  it("getNewArrivals returns items tagged 'new'", () => {
    const na = getNewArrivals();
    expect(na.length).toBeGreaterThan(0);
    for (const p of na) expect(p.tags).toContain("new");
  });

  it("featuredCategories has 5 entries", () => {
    expect(featuredCategories).toHaveLength(5);
  });

  it("trendingCollections has 9 entries", () => {
    expect(trendingCollections.length).toBe(9);
  });

  it("reviews are all rated 1-5", () => {
    for (const r of reviews) expect(r.rating).toBeGreaterThanOrEqual(1);
    for (const r of reviews) expect(r.rating).toBeLessThanOrEqual(5);
  });

  it("getProductsByCategory filters by category", () => {
    const posters = getProductsByCategory("Posters");
    for (const p of posters) expect(p.category).toBe("Posters");
  });
});
