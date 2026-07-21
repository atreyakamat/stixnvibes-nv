"use client";

import * as React from "react";

export type CartItem = {
  id: string; // unique cart-line id
  productId: string;
  variantId?: string | null;
  variantName?: string;
  name: string;
  slug?: string;
  image?: string;
  price_cents: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  subtotalCents: number;
  count: number;
  adding: boolean;
  addItem: (item: Omit<CartItem, "id" | "quantity">, qty?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = React.createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "snv.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [adding, setAdding] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore parse errors
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on changes (post-hydration only to avoid SSR mismatch)
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable — cart still works in-memory
    }
  }, [items, hydrated]);

  const addItem = React.useCallback((incoming: Omit<CartItem, "id" | "quantity">, qty = 1) => {
    setAdding(true);
    setItems((prev) => {
      const key = `${incoming.productId}:${incoming.variantId ?? "default"}`;
      const existing = prev.find((it) => `${it.productId}:${it.variantId ?? "default"}` === key);
      if (existing) {
        return prev.map((it) =>
          `${it.productId}:${it.variantId ?? "default"}` === key
            ? { ...it, quantity: Math.min(99, it.quantity + qty) }
            : it
        );
      }
      return [...prev, {
        id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        quantity: Math.min(99, Math.max(1, qty)),
        ...incoming,
      }];
    });
    // Clear the "adding" flag after a tick so toast/UI hooks can pulse
    window.setTimeout(() => setAdding(false), 400);
  }, []);

  const updateQuantity = React.useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((it) => it.id !== id);
      return prev.map((it) => (it.id === id ? { ...it, quantity: Math.min(99, quantity) } : it));
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const subtotalCents = items.reduce((s, it) => s + it.price_cents * it.quantity, 0);
  const count = items.reduce((s, it) => s + it.quantity, 0);

  const value: CartContextValue = {
    items,
    subtotalCents,
    count,
    adding,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return ctx;
}
