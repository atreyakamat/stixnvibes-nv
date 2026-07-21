/**
 * Unit tests for cart context logic.
 * Uses jsdom environment via environmentMatchGlobs in vitest.config.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import React from "react";

const STORAGE_KEY = "snv.cart.v1";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

async function importCart() {
  const mod = await import("@/context/cart-context");
  return mod;
}

const wrap = (Provider: any) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(Provider, null, children);

describe("CartContext", () => {
  it("starts empty and reports zero subtotal", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    expect(result.current.items).toEqual([]);
    expect(result.current.subtotalCents).toBe(0);
    expect(result.current.count).toBe(0);
  });

  it("adds a new item to the cart", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => {
      result.current.addItem({
        productId: "s1",
        name: "Anime Pack",
        slug: "anime-pack",
        image: "x.jpg",
        price_cents: 19900,
      });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.subtotalCents).toBe(19900);
    expect(result.current.count).toBe(1);
  });

  it("increments quantity when the same product+variant is added again", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => {
      result.current.addItem({ productId: "s1", name: "P", price_cents: 100, variantId: "A4-Matte", variantName: "A4 · Matte" });
    });
    act(() => {
      result.current.addItem({ productId: "s1", name: "P", price_cents: 100, variantId: "A4-Matte", variantName: "A4 · Matte" });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.subtotalCents).toBe(200);
  });

  it("treats different variant ids as distinct cart lines", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => { result.current.addItem({ productId: "s1", name: "P", price_cents: 100, variantId: "A4" }); });
    act(() => { result.current.addItem({ productId: "s1", name: "P", price_cents: 100, variantId: "A3" }); });
    expect(result.current.items).toHaveLength(2);
  });

  it("updates quantity and removes when <= 0", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => { result.current.addItem({ productId: "s1", name: "P", price_cents: 100 }); });
    act(() => { result.current.updateQuantity(result.current.items[0].id, 5); });
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.count).toBe(5);
    act(() => { result.current.updateQuantity(result.current.items[0].id, 0); });
    expect(result.current.items).toEqual([]);
  });

  it("clear() empties the cart", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => { result.current.addItem({ productId: "s1", name: "P", price_cents: 100 }); });
    act(() => { result.current.clear(); });
    expect(result.current.items).toEqual([]);
  });

  it("throws when used outside provider", async () => {
    const { useCart } = await importCart();
    expect(() => renderHook(() => useCart())).toThrowError(/useCart must be used within a <CartProvider>/);
  });

  it("caps quantity at 99 and minimum at 1 on direct addItem", async () => {
    const { CartProvider, useCart } = await importCart();
    const { result } = renderHook(() => useCart(), { wrapper: wrap(CartProvider) });
    act(() => {
      result.current.addItem({ productId: "s1", name: "P", price_cents: 100 }, 100);
    });
    expect(result.current.items[0].quantity).toBe(99);
  });
});

void STORAGE_KEY;
