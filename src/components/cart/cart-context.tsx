"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/constants";
import { minQtyShortfalls, normalizeCode, offerHints, shippingStatus, stockShortfalls, totals } from "@/lib/pricing";
import { pendingCode, setPendingCode } from "@/lib/track";
import type { AppliedOffer, Coupon, CustomFieldKind, Offer, ProductType } from "@/lib/types";
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
  /** Fewest of this product per order (summed over its lines). */
  minQty: number;
  /** Units in stock when added; null = not counted. */
  stock?: number | null;
  qty: number;
  selections: Record<string, string>;
  optionLabels: string[];
  /** Custom field values by field id (upload ids for photos). */
  custom: Record<string, string>;
  customDisplay: { label: string; value: string; kind: CustomFieldKind }[];
};

export type ShopConfig = {
  offers: Offer[];
  storeOpen: boolean;
  instagramHandle: string;
  orderNote: string;
  bulkNote: string;
  freeShippingAbovePaise: number | null;
  mrpMarkupPercent: number | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  applied: AppliedOffer[];
  hints: string[];
  /** Minimum-order problems that block checkout. */
  shortfalls: { productId: string; name: string; minQty: number; need: number; stock?: number }[];
  shipping: { free: boolean; needPaise: number } | null;
  /** The code in use (applied or not), and why it doesn't apply, if so. */
  coupon: CartCoupon | null;
  couponCode: string;
  couponProblem: string | null;
  applyCode: (code: string) => Promise<string | null>;
  removeCode: () => void;
  config: ShopConfig;
  ready: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "qty" | "key">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

/** The public part of a coupon the cart needs to price it. */
export type CartCoupon = Pick<Coupon, "code" | "percent" | "amountPaise" | "minOrderPaise" | "endsAt" | "description">;

type Lookup = { coupon?: CartCoupon; error?: string; /** The server said the code doesn't work (not a busy or offline error). */ rejected?: boolean };

async function lookupCode(code: string): Promise<Lookup> {
  try {
    const res = await fetch(`/api/coupon?code=${encodeURIComponent(code)}`);
    const body = (await res.json()) as Lookup;
    return { ...body, rejected: res.status === 404 || res.status === 410 };
  } catch {
    return { error: "Couldn't check the code. Try again." };
  }
}

// The cart sits on every page, so a checked code is remembered for the
// session instead of being looked up on each page load. The order is priced
// again on the server, so a stale copy can't give a wrong discount.
const CHECKED_KEY = "snv-code-checked";

function checkedCode(code: string): CartCoupon | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CHECKED_KEY) ?? "null") as { c: CartCoupon; at: number } | null;
    return saved && saved.c.code === code && Date.now() - saved.at < 30 * 60_000 ? saved.c : null;
  } catch {
    return null;
  }
}

function rememberCode(c: CartCoupon | null) {
  try {
    if (c) window.sessionStorage.setItem(CHECKED_KEY, JSON.stringify({ c, at: Date.now() }));
    else window.sessionStorage.removeItem(CHECKED_KEY);
  } catch {
    // Fine: it's looked up again next time.
  }
}

const asCoupon = (c: CartCoupon): Coupon => ({ ...c, maxUses: null, startsAt: null, source: "", active: true, createdAt: "" });

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
  const [coupon, setCoupon] = useState<CartCoupon | null>(null);

  useEffect(() => {
    // Hydrate from storage after mount so server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    // A code from a stall QR link (or typed earlier) is applied quietly; a
    // bad one is just dropped.
    const code = pendingCode();
    const known = code ? checkedCode(code) : null;
    if (known) setCoupon(known);
    else if (code)
      void lookupCode(code).then((r) => {
        if (r.coupon) {
          setCoupon(r.coupon);
          rememberCode(r.coupon);
        } else if (r.rejected) setPendingCode("");
      });
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const applyCode = useCallback(async (raw: string) => {
    const code = normalizeCode(raw);
    if (!code) return "Type a code.";
    const r = await lookupCode(code);
    if (!r.coupon) return r.error ?? "That code doesn't work.";
    setCoupon(r.coupon);
    setPendingCode(r.coupon.code);
    rememberCode(r.coupon);
    return null;
  }, []);

  const removeCode = useCallback(() => {
    setCoupon(null);
    setPendingCode("");
    rememberCode(null);
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
    const t = totals(items, config.offers, coupon ? asCoupon(coupon) : null);
    const products = [...new Map(items.map((i) => [i.productId, { id: i.productId, name: i.name, minQty: i.minQty ?? 1, stock: i.stock ?? null }])).values()];
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      ...t,
      hints: offerHints(items, config.offers, typeWord),
      shortfalls: [
        ...minQtyShortfalls(items, products),
        ...stockShortfalls(items, products).map((s) => ({ productId: s.productId, name: s.name, minQty: 0, need: 0, stock: s.stock })),
      ],
      coupon,
      applyCode,
      removeCode,
      shipping: shippingStatus(t.totalPaise, config.freeShippingAbovePaise),
      config,
      ready,
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, config, coupon, ready, drawerOpen, add, setQty, remove, clear, applyCode, removeCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
