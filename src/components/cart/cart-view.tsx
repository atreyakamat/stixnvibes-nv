"use client";

import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "./cart-context";
import { QtyStepper } from "./qty-stepper";
import { useQuote } from "./use-quote";

export function CartView() {
  const { items, ready, setQty, remove } = useCart();
  const q = useQuote(items, "ship", ready);

  if (!ready) return <p className="mt-10 text-mute">Loading your cart…</p>;
  if (items.length === 0) {
    return (
      <div className="mt-10 space-y-6">
        <p className="text-paper/70">Your cart is empty.</p>
        <Link href="/shop" className="btn btn-primary">
          Browse the shop
        </Link>
      </div>
    );
  }

  const problems = q.status === "ready" ? q.quote.problems : [];
  const problemFor = (variantId: string) => problems.find((p) => p.variantId === variantId)?.reason;
  const priced = q.status === "ready" ? new Map(q.quote.items.map((i) => [i.variantId, i])) : null;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => {
          const line = priced?.get(item.variantId);
          const problem = problemFor(item.variantId);
          return (
            <li key={item.variantId} className="flex gap-5 py-6">
              <Link href={`/shop/${item.slug}`} className="grid size-24 shrink-0 place-items-center rounded-2xl bg-surface p-3">
                {item.image && <img src={item.image} alt="" className="max-h-full w-auto object-contain" />}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/shop/${item.slug}`} className="text-lg font-medium hover:text-lemon">
                      {item.name}
                    </Link>
                    <p className="text-sm text-mute">{item.variantLabel}</p>
                  </div>
                  <p className="tabular-nums">
                    {formatINR(line ? line.lineTotalPaise : item.unitPricePaise * item.qty)}
                  </p>
                </div>
                {line && line.unitPricePaise !== item.unitPricePaise && (
                  <p className="mt-2 text-sm text-lemon">Price updated to {formatINR(line.unitPricePaise)} each.</p>
                )}
                {problem && (
                  <p className="mt-2 text-sm text-[#ff7a59]" role="alert">
                    {problem}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <QtyStepper value={item.qty} onChange={(n) => setQty(item.variantId, n)} label={item.name} />
                  <button type="button" onClick={() => remove(item.variantId)} className="text-sm text-mute hover:text-paper">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="ice h-fit space-y-4 rounded-[1.5rem] border border-line p-6">
        <h2 className="display text-3xl">Summary</h2>
        {q.status === "ready" ? (
          <>
            <div className="flex justify-between">
              <span className="text-paper/70">Subtotal</span>
              <span className="tabular-nums">{formatINR(q.quote.subtotalPaise)}</span>
            </div>
            {q.quote.toFreeShippingPaise !== null && (
              <p className="text-sm text-paper/70">
                Add {formatINR(q.quote.toFreeShippingPaise)} more for free shipping.
              </p>
            )}
            <p className="text-sm text-mute">Shipping or free pickup is chosen at checkout.</p>
            {!q.options.storeOpen ? (
              <p className="text-sm text-paper/80">Online orders open soon. Message us on Instagram to order now.</p>
            ) : problems.length > 0 ? (
              <p className="text-sm text-[#ff7a59]">Fix the items marked above to continue.</p>
            ) : (
              <Link href="/checkout" className="btn btn-primary w-full justify-center">
                Checkout
              </Link>
            )}
          </>
        ) : q.status === "error" ? (
          <p className="text-sm text-[#ff7a59]" role="alert">
            {q.error}
          </p>
        ) : (
          <p className="text-mute">Checking prices…</p>
        )}
      </aside>
    </div>
  );
}
