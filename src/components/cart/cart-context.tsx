"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/constants";

// The cart lives in the browser. Names and prices here are only for display;
// the server re-prices every line from the catalog at checkout.

export type CartItem = {
  productId: string;
  variantId: string;
  qty: number;
  name: string;
  variantLabel: string;
  image: string | null;
  slug: string;
  unitPricePaise: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalPaise: number;
  ready: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const KEY = "snv-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.variantId === "string" && i.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Hydrate from storage after mount so server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Private mode or full storage: the cart still works for this tab.
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, qty: Math.min(MAX_QTY_PER_LINE, i.qty + qty) } : i,
        );
      }
      return [...prev, { ...item, qty: Math.min(MAX_QTY_PER_LINE, qty) }];
    });
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.variantId !== variantId)
        : prev.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, qty) } : i)),
    );
  }, []);

  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotalPaise: items.reduce((n, i) => n + i.qty * i.unitPricePaise, 0),
      ready,
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, drawerOpen, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
