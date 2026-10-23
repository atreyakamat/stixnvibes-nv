"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/money";
import { useCart } from "./cart-context";
import { QtyStepper } from "./qty-stepper";

export function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, setQty, remove, subtotalPaise } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label="Close cart"
            tabIndex={-1}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="display text-3xl">Your cart</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid size-10 place-items-center rounded-full ring-1 ring-paper/25 hover:ring-lemon"
              >
                <span className="sr-only">Close cart</span>
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-paper/70">Nothing here yet. Go find your vibe.</p>
                <Link href="/shop" className="btn btn-primary">
                  Browse the shop
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
                  {items.map((item) => (
                    <li key={item.variantId} className="flex gap-4 py-5">
                      <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-ink p-2">
                        {item.image && <img src={item.image} alt="" className="max-h-full w-auto object-contain" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/shop/${item.slug}`} className="font-medium hover:text-lemon">
                          {item.name}
                        </Link>
                        <p className="text-sm text-mute">{item.variantLabel}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <QtyStepper value={item.qty} onChange={(q) => setQty(item.variantId, q)} label={item.name} />
                          <p className="tabular-nums">{formatINR(item.unitPricePaise * item.qty)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.variantId)}
                          className="mt-2 text-sm text-mute underline-offset-4 hover:text-paper hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="space-y-4 border-t border-line px-6 py-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-paper/70">Subtotal</span>
                    <span className="text-xl font-semibold tabular-nums">{formatINR(subtotalPaise)}</span>
                  </div>
                  <p className="text-sm text-mute">Shipping is worked out at checkout.</p>
                  <Link href="/checkout" className="btn btn-primary w-full justify-center">
                    Checkout
                  </Link>
                  <Link href="/cart" className="btn btn-ghost w-full justify-center">
                    View cart
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
