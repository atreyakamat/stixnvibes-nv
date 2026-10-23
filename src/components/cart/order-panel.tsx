"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";
import { track } from "@/lib/track";
import { orderMessage, waLink } from "@/lib/whatsapp";
import { useCart } from "./cart-context";

type Done = { number: string | null; url: string };

/** Totals, offer nudges and the "Order on WhatsApp" button. */
export function OrderPanel({ compact = false }: { compact?: boolean }) {
  const { items, subtotalPaise, discountPaise, totalPaise, applied, hints, config, clear } = useCart();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  // Built from the cart in the browser, used only if the server can't be
  // reached, so an order is never lost.
  const fallbackUrl = () =>
    waLink(
      config.whatsappNumber,
      orderMessage({
        lines: items.map((i) => ({ name: i.name, options: i.optionLabels, custom: i.customDisplay, qty: i.qty, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.unitPricePaise * i.qty })),
        subtotalPaise,
        discountPaise,
        totalPaise,
        offers: applied,
        customerName: name.trim(),
        customerNote: note.trim(),
      }),
    );

  async function order() {
    setBusy(true);
    setError("");
    // Phones hand wa.me links to the WhatsApp app; desktops get a new tab,
    // opened now (inside the tap) so pop-up blockers allow it.
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    const tab = mobile ? null : window.open("about:blank", "_blank");
    let result: Done;
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({ productId: i.productId, qty: i.qty, selections: i.selections, custom: i.custom })),
          customerName: name,
          customerNote: note,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { number?: string; whatsappUrl?: string; error?: string };
      if (res.status === 409 || res.status === 400) {
        tab?.close();
        setError(data.error ?? "Something in your cart changed. Check it and try again.");
        setBusy(false);
        return;
      }
      result = res.ok && data.whatsappUrl ? { number: data.number ?? null, url: data.whatsappUrl } : { number: null, url: fallbackUrl() };
    } catch {
      result = { number: null, url: fallbackUrl() };
    }
    if (!result.number) track("order_click");
    if (tab) tab.location.href = result.url;
    else window.location.href = result.url;
    setDone(result);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-lg font-medium">Your order is ready in WhatsApp{done.number ? ` (ref ${done.number})` : ""}.</p>
        <p className="text-sm text-paper/70">Hit send in WhatsApp and we&apos;ll reply to confirm. {config.orderNote}</p>
        <div className="flex flex-wrap gap-3">
          <a href={done.url} target="_blank" rel="noopener" className="btn btn-ghost !py-2.5">
            Didn&apos;t open? Tap here
          </a>
          <button
            type="button"
            className="btn btn-ghost !py-2.5"
            onClick={() => {
              clear();
              setDone(null);
            }}
          >
            Sent it, clear my cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hints.map((h) => (
        <p key={h} className="rounded-xl bg-lemon/10 px-3 py-2 text-sm text-lemon">
          {h}
        </p>
      ))}
      <dl className="space-y-1.5">
        {discountPaise > 0 && (
          <>
            <div className="flex justify-between text-paper/70">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatINR(subtotalPaise)}</dd>
            </div>
            {applied.map((a) => (
              <div key={a.offerId} className="flex justify-between text-lemon">
                <dt>
                  {a.name} <span className="text-paper/50">({a.freeUnits} free)</span>
                </dt>
                <dd className="tabular-nums">−{formatINR(a.discountPaise)}</dd>
              </div>
            ))}
          </>
        )}
        <div className="flex items-baseline justify-between">
          <dt className="text-paper/70">Total</dt>
          <dd className="text-2xl font-semibold tabular-nums" data-testid="cart-total">
            {formatINR(totalPaise)}
          </dd>
        </div>
      </dl>

      <details className="group text-sm" open={!compact}>
        <summary className="cursor-pointer text-paper/70 hover:text-paper">Add your name or a note (optional)</summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="sr-only">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" className="field !py-2.5" autoComplete="name" />
          </label>
          <label className="block">
            <span className="sr-only">Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Delivery area, gift note, anything else" className="field min-h-20 !py-2.5" />
          </label>
        </div>
      </details>

      {error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={order} disabled={busy || !items.length} className="btn btn-primary w-full justify-center disabled:opacity-50">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z" />
        </svg>
        {busy ? "Opening WhatsApp…" : "Order on WhatsApp"}
      </button>
      <p className="text-xs text-mute">{config.orderNote}</p>
    </div>
  );
}
