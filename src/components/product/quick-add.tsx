"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { formatINR } from "@/lib/money";
import { canOrder, defaultSelections, resolveOptions } from "@/lib/pricing";
import { track } from "@/lib/track";
import type { Product } from "@/lib/types";

/**
 * Add to cart straight from a product card. Option groups (size, frame…)
 * show as small pickers; products that need the customer's own input (a
 * song link, a photo) send them to the product page instead.
 */
export function QuickAdd({ product }: { product: Product }) {
  const { add, config, setDrawerOpen } = useCart();
  const [selections, setSelections] = useState(() => defaultSelections(product));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  if (!canOrder(product) || !config.storeOpen) return null;

  if (product.customFields.some((f) => f.required)) {
    return (
      <Link href={`/shop/${product.slug}`} className="btn btn-ghost mt-3 w-full justify-center !py-2 text-sm">
        Personalise &amp; add
      </Link>
    );
  }

  const resolved = resolveOptions(product, selections);
  const unit = resolved && product.pricePaise !== null ? Math.max(0, product.pricePaise + resolved.deltaPaise) : null;
  const qty = Math.max(1, product.minQty);
  const groups = product.options.filter((g) => g.values.length > 1);

  function addToCart() {
    if (!resolved || unit === null) return;
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        type: product.type,
        image: product.images[0] ?? null,
        unitPricePaise: unit,
        minQty: product.minQty,
        stock: product.stock,
        selections: resolved.selections,
        optionLabels: resolved.labels,
        custom: {},
        customDisplay: [],
      },
      qty,
    );
    track("add_to_cart", product.id);
    setAdded(true);
  }

  return (
    <div className="mt-3 space-y-2">
      {groups.map((g) => (
        <label key={g.id} className="block">
          <span className="sr-only">
            {g.name} for {product.name}
          </span>
          <select
            value={selections[g.id] ?? g.values[0].id}
            onChange={(e) => setSelections((s) => ({ ...s, [g.id]: e.target.value }))}
            className="field !py-1.5 text-sm"
            aria-label={`${g.name} for ${product.name}`}
          >
            {g.values.map((v) => (
              <option key={v.id} value={v.id}>
                {g.name}: {v.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        onClick={addToCart}
        disabled={unit === null}
        className={`btn w-full justify-center !py-2 text-sm ${added ? "btn-ghost" : "btn-primary"}`}
        aria-label={`Add ${product.name} to cart`}
      >
        {added ? "Added ✓" : `Add${qty > 1 ? ` ${qty}` : ""} · ${unit !== null ? formatINR(unit * qty) : ""}`}
      </button>
      {added && (
        <button type="button" onClick={() => setDrawerOpen(true)} className="block w-full text-center text-xs text-mute underline underline-offset-2 hover:text-paper">
          View cart
        </button>
      )}
      <p className="sr-only" aria-live="polite">
        {added ? `${product.name} added to cart` : ""}
      </p>
    </div>
  );
}
