"use client";

import * as React from "react";
import { Check, Trash2 } from "lucide-react";

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
  toastMessage: string | null;
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
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

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
    showToast(`Added ${incoming.name} to cart!`);
    window.setTimeout(() => setAdding(false), 400);
  }, [showToast]);

  const updateQuantity = React.useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((it) => it.id !== id);
      return prev.map((it) => (it.id === id ? { ...it, quantity: Math.min(99, quantity) } : it));
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) showToast(`Removed ${target.name} from cart.`);
      return prev.filter((it) => it.id !== id);
    });
  }, [showToast]);

  const clear = React.useCallback(() => setItems([]), []);

  const subtotalCents = items.reduce((s, it) => s + it.price_cents * it.quantity, 0);
  const count = items.reduce((s, it) => s + it.quantity, 0);

  const value: CartContextValue = {
    items,
    subtotalCents,
    count,
    adding,
    toastMessage,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 rounded-2xl border border-brand-yellow/30 bg-slate-900/95 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="grid size-6 place-items-center rounded-full bg-brand-yellow/20 text-brand-yellow">
            <Check className="size-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return ctx;
}
