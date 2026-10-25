"use client";

import { useCart } from "@/components/cart/cart-context";
import { formatINR } from "@/lib/money";
import { canOrder, fromPrice, hasPriceRange, mrpFor } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export function priceLabel(product: Product): string {
  if (product.status === "upcoming") return "Coming soon";
  const price = fromPrice(product);
  if (price === null) return "Ask on Instagram";
  return `${hasPriceRange(product) ? "From " : ""}${formatINR(price)}`;
}

/** Card price with the struck-through MRP; reads the markup from the shop config. */
export function CardPrice({ product }: { product: Product }) {
  const { config } = useCart();
  const orderable = canOrder(product);
  const price = fromPrice(product);
  const mrp = orderable && !hasPriceRange(product) ? mrpFor(price, product.compareAtPaise, config.mrpMarkupPercent) : null;
  return (
    <p className={`shrink-0 text-right text-sm tabular-nums ${orderable ? "text-lemon" : "text-mute"}`}>
      {mrp !== null && (
        <>
          <s className="mr-1.5 text-mute">{formatINR(mrp)}</s>
          <span className="sr-only">now </span>
        </>
      )}
      {priceLabel(product)}
    </p>
  );
}
