"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { CartLines } from "./cart-lines";
import { OrderPanel } from "./order-panel";

export function CartView() {
  const { items, ready, config } = useCart();

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

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="border-y border-line">
        <CartLines />
      </div>
      <aside className="h-fit space-y-4 rounded-[1.5rem] border border-line p-6 lg:sticky lg:top-28">
        <OrderPanel />
        {config.bulkNote && <p className="border-t border-line pt-4 text-sm text-paper/60">{config.bulkNote}</p>}
      </aside>
    </div>
  );
}
