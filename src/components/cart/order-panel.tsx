"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { getSource, track } from "@/lib/track";
import type { Address, Fulfilment } from "@/lib/types";
import { cleanHandle, INSTAGRAM_HANDLE_RE, orderMessage } from "@/lib/instagram";
import { CopyAndDm } from "../copy-and-dm";
import { useCart } from "./cart-context";

type Details = { name: string; phone: string; instagram: string; fulfilment: Fulfilment; address: Address; note: string };

const DETAILS_KEY = "snv-details-v1";
const EMPTY: Details = { name: "", phone: "", instagram: "", fulfilment: "delivery", address: { line: "", city: "", state: "Goa", pincode: "" }, note: "" };

function loadDetails(): Details {
  try {
    const saved = JSON.parse(window.localStorage.getItem(DETAILS_KEY) ?? "null") as Partial<Details> | null;
    return saved ? { ...EMPTY, ...saved, address: { ...EMPTY.address, ...saved.address }, note: "" } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Field errors before we bother the server. Same rules as the API. */
function check(d: Details): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 2) e.name = "Add your name.";
  if (!normalizePhone(d.phone)) e.phone = "Add a 10-digit mobile number.";
  const ig = cleanHandle(d.instagram);
  if (ig && !INSTAGRAM_HANDLE_RE.test(ig)) e.instagram = "That doesn't look like an Instagram username.";
  if (d.fulfilment === "delivery") {
    if (d.address.line.trim().length < 5) e.line = "Add your delivery address.";
    if (d.address.city.trim().length < 2) e.city = "Add your city.";
    if (!/^[1-9]\d{5}$/.test(d.address.pincode.trim())) e.pincode = "Add a 6-digit pincode.";
  }
  return e;
}

function Totals() {
  const { subtotalPaise, discountPaise, totalPaise, applied, shipping } = useCart();
  return (
    <dl className="space-y-1.5">
      {discountPaise > 0 && (
        <>
          <div className="flex justify-between text-paper/70">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatINR(subtotalPaise)}</dd>
          </div>
          {applied.map((a) => (
            <div key={a.offerId} className="flex justify-between gap-3 text-lemon">
              <dt>
                {a.name}
                {a.freeUnits > 0 && <span className="text-paper/50"> ({a.freeUnits} free)</span>}
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
      {shipping && (
        <div className="flex justify-between text-sm">
          <dt className="text-paper/70">Shipping</dt>
          <dd className={shipping.free ? "text-lemon" : "text-paper/70"}>
            {shipping.free ? "Free" : `Add ${formatINR(shipping.needPaise)} more for free shipping`}
          </dd>
        </div>
      )}
    </dl>
  );
}

function Nudges() {
  const { hints, shortfalls } = useCart();
  return (
    <>
      {shortfalls.map((s) => (
        <p key={`${s.productId}-${s.stock ?? "min"}`} className="rounded-xl bg-[#ff7a59]/10 px-3 py-2 text-sm text-[#ffb59f]" role="alert">
          {s.stock !== undefined ? `${s.name}: only ${s.stock} left. Lower the quantity to check out.` : `${s.name}: minimum ${s.minQty} per order. Add ${s.need} more to check out.`}
        </p>
      ))}
      {hints.map((h) => (
        <p key={h} className="rounded-xl bg-lemon/10 px-3 py-2 text-sm text-lemon">
          {h}
        </p>
      ))}
    </>
  );
}

function CouponField() {
  const { coupon, couponCode, couponProblem, applyCode, removeCode } = useCart();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
        <span>
          Code <strong className="font-mono">{coupon.code}</strong>
          {couponCode ? <span className="text-lemon"> applied</span> : couponProblem ? <span className="block text-[#ffb59f]">{couponProblem}</span> : null}
        </span>
        <button type="button" className="shrink-0 text-mute underline underline-offset-2 hover:text-paper" onClick={removeCode} aria-label={`Remove code ${coupon.code}`}>
          Remove
        </button>
      </div>
    );
  }
  if (!open)
    return (
      <button type="button" className="text-sm text-mute underline underline-offset-2 hover:text-paper" onClick={() => setOpen(true)}>
        Have a code?
      </button>
    );

  async function apply() {
    setBusy(true);
    setError((await applyCode(value)) ?? "");
    setBusy(false);
  }
  return (
    <div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="f-code">
          Code
        </label>
        <input
          id="f-code"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          maxLength={20}
          placeholder="CODE"
          className="field !py-2.5 font-mono uppercase"
          autoComplete="off"
        />
        <button type="button" className="btn btn-ghost !py-2.5" disabled={busy || !value.trim()} onClick={() => void apply()}>
          {busy ? "…" : "Apply"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#ff7a59]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Totals, offer nudges and checkout. The drawer (compact) only shows totals
 * and links to the cart page, where the details form lives.
 */
export function OrderPanel({ compact = false }: { compact?: boolean }) {
  const { items, subtotalPaise, discountPaise, totalPaise, applied, shortfalls, config, clear, setDrawerOpen, coupon } = useCart();
  const router = useRouter();
  const [d, setD] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    // Returning customers get their details back. Read after mount so the
    // server HTML matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD(loadDetails());
  }, []);

  useEffect(() => {
    if (!compact) track("checkout");
  }, [compact]);

  if (compact) {
    return (
      <div className="space-y-4">
        <Nudges />
        <Totals />
        <Link href="/cart" onClick={() => setDrawerOpen(false)} className="btn btn-primary w-full justify-center" aria-disabled={shortfalls.length > 0}>
          Checkout
        </Link>
      </div>
    );
  }

  const set = (patch: Partial<Details>) => setD((prev) => ({ ...prev, ...patch }));
  const setAddr = (patch: Partial<Address>) => setD((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  const invalid = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `err-${k}` } : {});
  const fieldError = (k: string) =>
    errors[k] ? (
      <span id={`err-${k}`} className="mt-1 block text-xs text-[#ff7a59]">
        {errors[k]}
      </span>
    ) : null;

  // Built from the cart in the browser, used only if the server can't be
  // reached, so an order is never lost.
  const fallbackMessage = () =>
    orderMessage({
        lines: items.map((i) => ({ name: i.name, options: i.optionLabels, custom: i.customDisplay, qty: i.qty, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.unitPricePaise * i.qty })),
        subtotalPaise,
        discountPaise,
        totalPaise,
        offers: applied,
        customerName: d.name.trim(),
        customerPhone: normalizePhone(d.phone) ?? d.phone.trim(),
        fulfilment: d.fulfilment,
        address: d.address,
        customerNote: d.note.trim(),
        freeShippingAbovePaise: config.freeShippingAbovePaise,
    });

  async function order(e: React.FormEvent) {
    e.preventDefault();
    const found = check(d);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      window.localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...d, note: "" }));
    } catch {
      // Not saving details is fine.
    }
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({ productId: i.productId, qty: i.qty, selections: i.selections, custom: i.custom })),
          customerName: d.name,
          customerPhone: d.phone,
          fulfilment: d.fulfilment,
          address: d.address,
          customerNote: d.note,
          instagram: d.instagram,
          couponCode: coupon?.code ?? "",
          source: getSource(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { orderPath?: string; error?: string };
      // The order page has the "send it on Instagram" step and stays as
      // the customer's link to the order.
      if (res.ok && data.orderPath) {
        clear();
        router.push(`${data.orderPath}&new=1`);
        return;
      }
      if (res.status === 400 || res.status === 409 || res.status === 429) {
        setError(data.error ?? "Something in your cart changed. Check it and try again.");
        setBusy(false);
        return;
      }
    } catch {
      // Network trouble: fall through.
    }
    // Server trouble: send the order on Instagram straight from the browser.
    track("order_click");
    setFallback(fallbackMessage());
    setBusy(false);
  }

  if (fallback) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-lg font-medium">Our order system is having a moment, so send your order straight to us on Instagram.</p>
        <CopyAndDm handle={config.instagramHandle} message={fallback} />
        <button type="button" className="btn btn-ghost !py-2.5" onClick={() => (clear(), setFallback(null))}>
          Sent it, clear my cart
        </button>
      </div>
    );
  }

  const pickup = d.fulfilment === "pickup";

  return (
    <form className="space-y-4" onSubmit={order} noValidate>
      <Nudges />
      <Totals />
      <CouponField />

      <fieldset className="space-y-3 border-t border-line pt-4">
        <legend className="label mb-3 text-mute">Your details</legend>
        <label className="block">
          <span className="mb-1 block text-sm text-paper/70">Name</span>
          <input id="f-name" value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} className="field !py-2.5" autoComplete="name" {...invalid("name")} />
        </label>
        {fieldError("name")}
        <label className="block">
          <span className="mb-1 block text-sm text-paper/70">Phone number</span>
          <input
            id="f-phone"
            value={d.phone}
            onChange={(e) => set({ phone: e.target.value })}
            maxLength={16}
            inputMode="tel"
            placeholder="98765 43210"
            className="field !py-2.5"
            autoComplete="tel-national"
            {...invalid("phone")}
          />
        </label>
        {fieldError("phone")}
        <label className="block">
          <span className="mb-1 block text-sm text-paper/70">
            Instagram username <span className="text-mute">(optional, so we can DM you)</span>
          </span>
          <input
            id="f-instagram"
            value={d.instagram}
            onChange={(e) => set({ instagram: e.target.value })}
            maxLength={60}
            placeholder="@yourname"
            className="field !py-2.5"
            autoComplete="off"
            autoCapitalize="none"
            {...invalid("instagram")}
          />
          <span className="mt-1 block text-xs text-mute">No Instagram? We&apos;ll reach you on WhatsApp at the number above.</span>
        </label>
        {fieldError("instagram")}

        <div role="radiogroup" aria-label="Delivery or pickup" className="grid grid-cols-2 gap-2">
          {(
            [
              ["delivery", "Deliver to me"],
              ["pickup", "Pick up at a stall"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm transition-colors ${d.fulfilment === id ? "border-lemon text-lemon" : "border-line text-paper/70 hover:border-paper/40"}`}>
              <input type="radio" name="fulfilment" value={id} checked={d.fulfilment === id} onChange={() => set({ fulfilment: id })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>

        {!pickup && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-paper/70">Address</span>
              <textarea
                id="f-line"
                value={d.address.line}
                onChange={(e) => setAddr({ line: e.target.value })}
                maxLength={200}
                placeholder="House, street, area, landmark"
                className="field min-h-20 !py-2.5"
                autoComplete="street-address"
                {...invalid("line")}
              />
            </label>
            {fieldError("line")}
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-sm text-paper/70">City</span>
                <input id="f-city" value={d.address.city} onChange={(e) => setAddr({ city: e.target.value })} maxLength={60} className="field !py-2.5" autoComplete="address-level2" {...invalid("city")} />
              </label>
              {fieldError("city")}
              <label className="block">
                <span className="mb-1 block text-sm text-paper/70">Pincode</span>
                <input
                  id="f-pincode"
                  value={d.address.pincode}
                  onChange={(e) => setAddr({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  inputMode="numeric"
                  className="field !py-2.5"
                  autoComplete="postal-code"
                  {...invalid("pincode")}
                />
              </label>
              {fieldError("pincode")}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-paper/70">State</span>
              <input value={d.address.state} onChange={(e) => setAddr({ state: e.target.value })} maxLength={40} className="field !py-2.5" autoComplete="address-level1" />
            </label>
          </>
        )}
        {pickup && <p className="text-sm text-paper/70">We&apos;ll tell you on Instagram where our next stall is. Pay when you pick up, or online.</p>}

        <label className="block">
          <span className="mb-1 block text-sm text-paper/70">Note (optional)</span>
          <textarea value={d.note} onChange={(e) => set({ note: e.target.value })} maxLength={500} placeholder="Gift note, timing, anything else" className="field min-h-16 !py-2.5" />
        </label>
      </fieldset>

      {error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !items.length || shortfalls.length > 0} className="btn btn-primary w-full justify-center disabled:opacity-50">
        {busy ? "Placing your order…" : "Place order"}
      </button>
      <p className="text-xs text-mute">{config.orderNote}</p>
    </form>
  );
}
