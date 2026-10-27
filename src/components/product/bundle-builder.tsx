"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { formatINR } from "@/lib/money";
import { defaultSelections, isSoldOut, resolveOptions } from "@/lib/pricing";
import { track } from "@/lib/track";
import type { Product } from "@/lib/types";

/**
 * Pick a pack of stickers in one go. The shop's buy-X-get-Y sticker offer
 * sets the pack size (buy 4 get 1 → packs of 5); the cart applies the deal.
 */
export function BundleBuilder({ stickers, deal }: { stickers: Product[]; deal: { buy: number; free: number; name: string } | null }) {
  const { add, setDrawerOpen } = useCart();
  const size = deal ? deal.buy + deal.free : 5;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(0);
  // A choice every sticker shares, like Material: paper vinyl or waterproof.
  const shared = stickers[0]?.options.find((g) => g.values.length > 1 && stickers.every((p) => p.options.some((o) => o.id === g.id && o.values.length === g.values.length)));
  const [choice, setChoice] = useState(shared?.values[0]?.id ?? "");

  const picked = Object.values(counts).reduce((n, c) => n + c, 0);
  const packs = Math.floor(picked / size);
  const toNext = picked === 0 ? size : (size - (picked % size)) % size;
  const unit = (p: Product) => {
    const r = resolveOptions(p, { ...defaultSelections(p), ...(shared ? { [shared.id]: choice } : {}) });
    return r && p.pricePaise !== null ? { price: Math.max(0, p.pricePaise + r.deltaPaise), r } : null;
  };
  const subtotal = stickers.reduce((n, p) => n + (unit(p)?.price ?? 0) * (counts[p.id] ?? 0), 0);
  // Cheapest units go free, as in the cart.
  const prices = stickers.flatMap((p) => Array.from({ length: counts[p.id] ?? 0 }, () => unit(p)?.price ?? 0)).sort((a, b) => a - b);
  const freeValue = deal ? prices.slice(0, packs * deal.free).reduce((n, x) => n + x, 0) : 0;

  const bump = (id: string, d: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(99, (c[id] ?? 0) + d)) }));

  function surprise() {
    const room = toNext || size;
    const pool = stickers.filter((p) => !isSoldOut(p));
    setCounts((c) => {
      const next = { ...c };
      for (let i = 0; i < room && pool.length; i++) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        next[p.id] = (next[p.id] ?? 0) + 1;
      }
      return next;
    });
  }

  function addAll() {
    let n = 0;
    for (const p of stickers) {
      const qty = counts[p.id] ?? 0;
      const u = unit(p);
      if (!qty || !u) continue;
      add(
        {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          type: p.type,
          image: p.images[0] ?? null,
          unitPricePaise: u.price,
          minQty: p.minQty,
          stock: p.stock,
          selections: u.r.selections,
          optionLabels: u.r.labels,
          custom: {},
          customDisplay: [],
        },
        qty,
      );
      track("add_to_cart", p.id);
      n += qty;
    }
    setAdded(n);
    setCounts({});
    setDrawerOpen(true);
  }

  return (
    <div className="pb-32">
      <div className="flex flex-wrap items-center gap-3">
        {shared && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-paper/70">{shared.name}</span>
            <select value={choice} onChange={(e) => setChoice(e.target.value)} className="field !w-auto !py-2 text-sm" aria-label={`${shared.name} for every sticker`}>
              {shared.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={surprise} className="btn btn-ghost !py-2 text-sm">
          Surprise me
        </button>
        {picked > 0 && (
          <button type="button" onClick={() => setCounts({})} className="text-sm text-mute underline underline-offset-2">
            Start over
          </button>
        )}
      </div>

      <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3 lg:grid-cols-6">
        {stickers.map((p) => {
          const n = counts[p.id] ?? 0;
          const out = isSoldOut(p);
          return (
            <li key={p.id} className="relative">
              <button
                type="button"
                disabled={out}
                onClick={() => bump(p.id, 1)}
                className={`ice flex w-full flex-col rounded-2xl border p-2 text-left transition-colors ${n ? "border-lemon" : "border-line hover:border-paper/30"} disabled:opacity-40`}
                aria-label={`Add ${p.name} to the pack`}
              >
                <span className="grid aspect-square place-items-center rounded-xl bg-ink/60 p-2">
                  {p.images[0] && <img src={p.images[0]} alt="" loading="lazy" className="sticker-shadow max-h-full w-auto object-contain" />}
                </span>
                <span className="mt-1.5 truncate text-xs">{p.name}</span>
              </button>
              {n > 0 && (
                <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-lemon pl-1 text-xs font-bold text-ink">
                  <button type="button" onClick={() => bump(p.id, -1)} className="grid size-6 place-items-center rounded-full" aria-label={`One less ${p.name}`}>
                    −
                  </button>
                  <span className="pr-2 tabular-nums">{n}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur">
        <div className="container-x flex flex-wrap items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: size }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${i < picked % size || (picked > 0 && picked % size === 0) ? "bg-lemon" : "bg-paper/15"}`} />
              ))}
            </div>
            <p className="mt-2 text-sm" role="status" data-testid="bundle-status">
              {added > 0 && picked === 0
                ? `Added ${added} to your cart.`
                : picked === 0
                  ? `Tap stickers to fill a pack of ${size}.`
                  : toNext === 0
                    ? `${packs} pack${packs === 1 ? "" : "s"} done${deal ? `: ${packs * deal.free} free` : ""}. Add more or check out.`
                    : `${picked} picked. ${toNext} more${deal && toNext <= deal.free ? (toNext === 1 ? " and it's free" : " and they're free") : ` to finish the pack`}.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-mute">{freeValue > 0 && <span className="text-lemon">−{formatINR(freeValue)} free </span>}</p>
            <p className="text-xl font-semibold tabular-nums">{formatINR(subtotal - freeValue)}</p>
          </div>
          <button type="button" onClick={addAll} disabled={!picked} className="btn btn-primary disabled:opacity-40">
            Add {picked || ""} to cart
          </button>
        </div>
      </div>
    </div>
  );
}
