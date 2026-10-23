"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/constants";
import { offerHints, totals } from "@/lib/pricing";
import type { AppliedOffer, CustomFieldKind, Offer, ProductType } from "@/lib/types";
import { PRODUCT_TYPES } from "@/lib/types";

// The cart lives in the browser. Names and prices here are for display; the
// server re-prices every line from the catalog when the order is sent.

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: ProductType;
  image: string | null;
  unitPricePaise: number;
  qty: number;
  selections: Record<string, string>;
  optionLabels: string[];
  /** Custom field values by field id (upload ids for photos). */
  custom: Record<string, string>;
  customDisplay: { label: string; value: string; kind: CustomFieldKind }[];
};

export type ShopConfig = { offers: Offer[]; storeOpen: boolean; whatsappNumber: string; orderNote: string; bulkNote: string };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  applied: AppliedOffer[];
  hints: string[];
  config: ShopConfig;
  ready: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "qty" | "key">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const KEY = "snv-cart-v3";
const CartContext = createContext<CartContextValue | null>(null);

export const lineKey = (i: Pick<CartItem, "productId" | "selections" | "custom">) =>
  `${i.productId}|${JSON.stringify(Object.entries(i.selections).sort())}|${JSON.stringify(Object.entries(i.custom).sort())}`;

function load(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.key === "string" && i.qty > 0) : [];
  } catch {
    return [];
  }
}

const typeWord = (type: ProductType | null, n: number) => {
  const t = PRODUCT_TYPES.find((x) => x.id === type);
  if (!t) return n === 1 ? "item" : "items";
  return (n === 1 ? t.one : t.label).toLowerCase();
};

export function CartProvider({ children, config }: { children: ReactNode; config: ShopConfig }) {
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

  const add = useCallback((item: Omit<CartItem, "qty" | "key">, qty = 1) => {
    const key = lineKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(MAX_QTY_PER_LINE, i.qty + qty) } : i));
      return [...prev, { ...item, key, qty: Math.min(MAX_QTY_PER_LINE, qty) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, qty) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const t = totals(items, config.offers);
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      ...t,
      hints: offerHints(items, config.offers, typeWord),
      config,
      ready,
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, config, ready, drawerOpen, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
