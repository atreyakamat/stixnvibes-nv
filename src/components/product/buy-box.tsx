"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { QtyStepper } from "@/components/cart/qty-stepper";
import { formatINR } from "@/lib/money";
import { canOrder, defaultSelections, mrpFor, resolveOptions } from "@/lib/pricing";
import { track } from "@/lib/track";
import type { Product } from "@/lib/types";
import { askMessage } from "@/lib/instagram";
import { CopyAndDm } from "../copy-and-dm";

type UploadState = { id: string; preview: string } | { busy: true } | { error: string };

export function BuyBox({ product, url }: { product: Product; url: string }) {
  const { add, setDrawerOpen, config } = useCart();
  const [selections, setSelections] = useState(() => defaultSelections(product));
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(0);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("view", product.id);
  }, [product.id]);

  const resolved = resolveOptions(product, selections);
  const unit = product.pricePaise === null || !resolved ? null : Math.max(0, product.pricePaise + resolved.deltaPaise);
  const mrp = product.status === "live" ? mrpFor(unit, product.compareAtPaise, config.mrpMarkupPercent) : null;
  const orderable = canOrder(product) && config.storeOpen;
  const offers = config.offers.filter((o) => o.productType === product.type);

  async function upload(fieldId: string, file: File | undefined) {
    if (!file) return;
    setUploads((u) => ({ ...u, [fieldId]: { busy: true } }));
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Upload failed. Try again.");
      setUploads((u) => ({ ...u, [fieldId]: { id: data.id!, preview: URL.createObjectURL(file) } }));
      setCustom((c) => ({ ...c, [fieldId]: data.id! }));
    } catch (err) {
      setUploads((u) => ({ ...u, [fieldId]: { error: (err as Error).message } }));
      setCustom((c) => {
        const next = { ...c };
        delete next[fieldId];
        return next;
      });
    }
  }

  function addToCart(openCart: boolean) {
    setError("");
    if (!resolved || unit === null) return;
    const missing = product.customFields.find((f) => f.required && !custom[f.id]?.trim());
    if (missing) {
      setError(`Fill in "${missing.label}" first.`);
      return;
    }
    if (Object.values(uploads).some((u) => "busy" in u)) {
      setError("Wait for your photo to finish uploading.");
      return;
    }
    const filled = Object.fromEntries(Object.entries(custom).filter(([, v]) => v.trim()));
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        type: product.type,
        image: product.images[0] ?? null,
        unitPricePaise: unit,
        minQty: product.minQty,
        selections: resolved.selections,
        optionLabels: resolved.labels,
        custom: filled,
        customDisplay: product.customFields
          .filter((f) => filled[f.id])
          .map((f) => ({ label: f.label, kind: f.kind, value: f.kind === "image" ? `${window.location.origin}/u/${filled[f.id]}` : filled[f.id] })),
      },
      qty,
    );
    track("add_to_cart", product.id);
    setAdded((n) => n + 1);
    if (openCart) setDrawerOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-3xl font-semibold tabular-nums text-lemon" data-testid="price">
          {product.status === "upcoming" ? "Coming soon" : unit !== null ? formatINR(unit) : "Ask for price"}
        </p>
        {mrp !== null && unit !== null && (
          <>
            <p className="text-lg tabular-nums text-mute">
              MRP <s>{formatINR(mrp)}</s>
            </p>
            <p className="rounded-full bg-lemon/10 px-2.5 py-1 text-sm font-medium text-lemon">{Math.round(((mrp - unit) / mrp) * 100)}% off</p>
          </>
        )}
      </div>
      {product.minQty > 1 && product.status === "live" && <p className="text-sm text-paper/70">Minimum {product.minQty} per order. Mix different designs or songs.</p>}
      {offers.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {offers.map((o) => (
            <li key={o.id} className="rounded-full bg-lemon/10 px-3 py-1.5 text-sm text-lemon">
              {o.name}
            </li>
          ))}
        </ul>
      )}

      {product.options.filter((g) => g.values.length > 1).map((g) => (
        <fieldset key={g.id}>
          <legend className="label text-mute">{g.name}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.values.map((v) => {
              const on = selections[g.id] === v.id;
              return (
                <label
                  key={v.id}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm ring-1 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lemon ${
                    on ? "bg-lemon text-ink ring-lemon" : "ring-paper/25 hover:ring-lemon"
                  }`}
                >
                  <input type="radio" name={`opt-${g.id}`} value={v.id} checked={on} onChange={() => setSelections((s) => ({ ...s, [g.id]: v.id }))} className="sr-only" />
                  {v.label}
                  {v.priceDeltaPaise !== 0 && product.pricePaise !== null && (
                    <span className={on ? "text-ink/70" : "text-mute"}>
                      {" "}
                      {v.priceDeltaPaise > 0 ? "+" : "−"}
                      {formatINR(Math.abs(v.priceDeltaPaise))}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {orderable && product.customFields.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-line p-4">
          <p className="label text-mute">Make it yours</p>
          {product.customFields.map((f) => {
            const id = `cf-${f.id}`;
            const up = uploads[f.id];
            return (
              <div key={f.id}>
                <label htmlFor={id} className="mb-1.5 block text-sm">
                  {f.label}
                  {f.required ? <span className="text-lemon"> *</span> : <span className="text-mute"> (optional)</span>}
                </label>
                {f.kind === "image" ? (
                  <div className="flex items-center gap-3">
                    {up && "preview" in up && <img src={up.preview} alt="" className="size-14 rounded-lg object-cover" />}
                    <input id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(f.id, e.target.files?.[0])} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-paper/10 file:px-4 file:py-2 file:text-paper" />
                    {up && "busy" in up && <span className="text-sm text-mute">Uploading…</span>}
                  </div>
                ) : f.kind === "textarea" ? (
                  <textarea id={id} value={custom[f.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))} maxLength={600} className="field min-h-20 !py-2.5" />
                ) : (
                  <input
                    id={id}
                    type={f.kind === "link" ? "url" : "text"}
                    inputMode={f.kind === "link" ? "url" : undefined}
                    value={custom[f.id] ?? ""}
                    onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))}
                    maxLength={600}
                    className="field !py-2.5"
                    placeholder={f.kind === "link" ? "https://open.spotify.com/track/…" : undefined}
                  />
                )}
                {up && "error" in up && <p className="mt-1 text-sm text-[#ff7a59]">{up.error}</p>}
                {f.help && <p className="mt-1 text-xs text-mute">{f.help}</p>}
              </div>
            );
          })}
        </div>
      )}

      {orderable && unit !== null ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={(q) => setQty(Math.max(1, q))} label={product.name} />
            <button type="button" className="btn btn-primary" onClick={() => addToCart(true)}>
              Add to cart
            </button>
          </div>
          {error && (
            <p className="text-sm text-[#ff7a59]" role="alert">
              {error}
            </p>
          )}
          <span className="sr-only" aria-live="polite">
            {added > 0 ? `${product.name} added to cart` : ""}
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-paper/70">
            {product.status === "upcoming"
              ? "Dropping soon. Message us to get it first."
              : product.soldOut
                ? "Sold out right now. Message us and we'll tell you when it's back."
                : !config.storeOpen
                  ? "Online orders are paused. Message us and we'll sort it out."
                  : "Message us for the price and options."}
          </p>
          <CopyAndDm
            handle={config.instagramHandle}
            message={askMessage(product.name, url)}
            label="Ask on Instagram"
            className="btn btn-primary"
            onSent={() => track("ask_click", product.id)}
          />
        </div>
      )}
    </div>
  );
}
