"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { QtyStepper } from "@/components/cart/qty-stepper";
import { site } from "@/content/site";
import { formatINR } from "@/lib/money";
import type { Product } from "@/lib/types";

export function AddToCart({ product, storeOpen }: { product: Product; storeOpen: boolean }) {
  const variants = product.variants.filter((v) => v.active);
  const firstBuyable = variants.find((v) => v.pricePaise !== null && v.stock !== 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstBuyable?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(0);
  const { add, setDrawerOpen } = useCart();

  const variant = variants.find((v) => v.id === variantId);
  if (!variant) return <p className="text-paper/70">Not available right now.</p>;

  const priced = variant.pricePaise !== null;
  const soldOut = variant.stock === 0;
  const maxQty = variant.stock ?? undefined;

  return (
    <div className="space-y-6">
      <p className="text-3xl font-semibold tabular-nums text-lemon">
        {priced ? formatINR(variant.pricePaise!) : "Price on request"}
      </p>

      {variants.length > 1 && (
        <fieldset>
          <legend className="label text-mute">Option</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm ring-1 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lemon ${
                  v.id === variantId ? "bg-lemon text-ink ring-lemon" : "ring-paper/25 hover:ring-lemon"
                } ${v.stock === 0 ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                  className="sr-only"
                />
                {v.label}
                {v.stock === 0 && " (sold out)"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {variant.stock !== null && variant.stock > 0 && variant.stock <= 5 && (
        <p className="text-sm text-paper/70">Only {variant.stock} left.</p>
      )}

      {!storeOpen || !priced ? (
        <div className="space-y-3">
          <p className="text-paper/70">
            {!storeOpen ? "Online orders open soon." : "This one isn't priced online yet."} Message us and we&apos;ll sort it out.
          </p>
          <a href={site.contact.instagramDm} target="_blank" rel="noopener" className="btn btn-primary">
            Order on Instagram
          </a>
        </div>
      ) : soldOut ? (
        <p className="text-paper/70">Sold out. DM us on Instagram and we&apos;ll tell you when it&apos;s back.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} onChange={(q) => setQty(Math.max(1, q))} label={product.name} max={maxQty} />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              add(
                {
                  productId: product.id,
                  variantId: variant.id,
                  name: product.name,
                  variantLabel: variant.label,
                  image: product.images[0] ?? null,
                  slug: product.slug,
                  unitPricePaise: variant.pricePaise!,
                },
                qty,
              );
              setAdded((n) => n + 1);
              setDrawerOpen(true);
            }}
          >
            Add to cart
          </button>
          <span className="sr-only" aria-live="polite">
            {added > 0 ? `${product.name} added to cart` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
