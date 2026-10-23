"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/orders/pricing";
import type { Fulfilment } from "@/lib/types";
import type { CartItem } from "./cart-context";

export type ShopOptions = {
  storeOpen: boolean;
  shippingEnabled: boolean;
  shipsTo: string;
  pickupEnabled: boolean;
  pickupNote: string;
  upiEnabled: boolean;
  minOrderPaise: number;
  dispatchNote: string;
};

type State =
  | { status: "idle" | "loading" }
  | { status: "ready"; quote: Quote; options: ShopOptions }
  | { status: "error"; error: string };

/** Asks the server to price the cart. Re-runs when the cart or delivery choice changes. */
export function useQuote(items: CartItem[], fulfilment: Fulfilment, enabled = true): State {
  const [state, setState] = useState<State>({ status: "idle" });
  const key = JSON.stringify(items.map((i) => [i.productId, i.variantId, i.qty]));

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => (s.status === "ready" ? s : { status: "loading" }));
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: items.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
        fulfilment,
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't price your cart.");
        setState({ status: "ready", quote: data.quote, options: data.options });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ status: "error", error: err.message });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fulfilment, enabled]);

  return state;
}
