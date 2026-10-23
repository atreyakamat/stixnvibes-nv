"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useCart } from "@/components/cart/cart-context";
import { useQuote } from "@/components/cart/use-quote";
import { formatINR } from "@/lib/money";
import type { Fulfilment, PaymentMethod } from "@/lib/types";

const STATES = [
  "Goa", "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function Field({
  label,
  name,
  error,
  children,
  hint,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-paper/80">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-mute">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-[#ff7a59]">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("ship");
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const q = useQuote(items, fulfilment, ready);

  // Fall back to whatever the shop actually offers.
  const opts = q.status === "ready" ? q.options : null;
  const effFulfilment: Fulfilment = opts && !opts.shippingEnabled && opts.pickupEnabled ? "pickup" : fulfilment;
  const effPayment: PaymentMethod =
    effFulfilment !== "pickup" || (opts && !opts.pickupEnabled) ? "upi" : opts && !opts.upiEnabled ? "pickup" : payment;

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

  const err = (name: string) => errors[name];
  const aria = (name: string) => ({
    id: name,
    name,
    "aria-invalid": err(name) ? true : undefined,
    "aria-describedby": err(name) ? `${name}-error` : undefined,
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
          fulfilment: effFulfilment,
          paymentMethod: effPayment,
          customer: { name: get("name"), phone: get("phone"), email: get("email"), instagram: get("instagram") },
          address:
            effFulfilment === "ship"
              ? { line1: get("line1"), line2: get("line2"), city: get("city"), state: get("state"), pincode: get("pincode") }
              : null,
          notes: get("notes"),
          company: get("company"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries((data.fields ?? {}) as Record<string, string>)) {
          fields[k.replace(/^(customer|address)\./, "")] = v;
        }
        setErrors(fields);
        setFormError(data.error ?? "Couldn't place your order.");
        setSubmitting(false);
        return;
      }
      clear();
      router.push(`/order/${data.number}?k=${data.token}`);
    } catch {
      setFormError("Network problem. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const radio = (active: boolean) =>
    `flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lemon ${
      active ? "border-lemon bg-lemon/5" : "border-line hover:border-paper/40"
    }`;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-10">
        {opts && (opts.shippingEnabled && opts.pickupEnabled) && (
          <fieldset>
            <legend className="display mb-4 text-3xl">Delivery</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={radio(effFulfilment === "ship")}>
                <input type="radio" name="fulfilment" className="accent-lemon" checked={effFulfilment === "ship"} onChange={() => setFulfilment("ship")} />
                <span>
                  <span className="block font-medium">Ship to me</span>
                  <span className="text-sm text-mute">{opts.shipsTo || "Delivered to your address"}</span>
                </span>
              </label>
              <label className={radio(effFulfilment === "pickup")}>
                <input type="radio" name="fulfilment" className="accent-lemon" checked={effFulfilment === "pickup"} onChange={() => setFulfilment("pickup")} />
                <span>
                  <span className="block font-medium">Pick up, free</span>
                  <span className="text-sm text-mute">{opts.pickupNote || "Collect from us in Goa"}</span>
                </span>
              </label>
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-4">
          <legend className="display mb-4 text-3xl">Your details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" error={err("name")}>
              <input {...aria("name")} className="field" autoComplete="name" required />
            </Field>
            <Field label="Mobile number" name="phone" error={err("phone")} hint="For order updates on WhatsApp.">
              <input {...aria("phone")} className="field" type="tel" inputMode="tel" autoComplete="tel-national" required />
            </Field>
            <Field label="Email (optional)" name="email" error={err("email")}>
              <input {...aria("email")} className="field" type="email" autoComplete="email" />
            </Field>
            <Field label="Instagram (optional)" name="instagram" error={err("instagram")}>
              <input {...aria("instagram")} className="field" placeholder="@yourhandle" autoCapitalize="none" />
            </Field>
          </div>
          {/* Honeypot, hidden from people and screen readers. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </fieldset>

        {effFulfilment === "ship" && (
          <fieldset className="space-y-4">
            <legend className="display mb-4 text-3xl">Address</legend>
            {err("address") && <p className="text-sm text-[#ff7a59]">{err("address")}</p>}
            <Field label="House, building, street" name="line1" error={err("line1")}>
              <input {...aria("line1")} className="field" autoComplete="address-line1" required />
            </Field>
            <Field label="Area, landmark (optional)" name="line2" error={err("line2")}>
              <input {...aria("line2")} className="field" autoComplete="address-line2" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" name="city" error={err("city")}>
                <input {...aria("city")} className="field" autoComplete="address-level2" required />
              </Field>
              <Field label="State" name="state" error={err("state")}>
                <select {...aria("state")} className="field" autoComplete="address-level1" defaultValue="Goa">
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pincode" name="pincode" error={err("pincode")}>
                <input {...aria("pincode")} className="field" inputMode="numeric" autoComplete="postal-code" maxLength={6} required />
              </Field>
            </div>
          </fieldset>
        )}

        {effFulfilment === "pickup" && opts?.upiEnabled && (
          <fieldset>
            <legend className="display mb-4 text-3xl">Payment</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={radio(effPayment === "upi")}>
                <input type="radio" name="pay" className="accent-lemon" checked={effPayment === "upi"} onChange={() => setPayment("upi")} />
                <span>
                  <span className="block font-medium">Pay now with UPI</span>
                  <span className="text-sm text-mute">GPay, PhonePe, Paytm, any UPI app</span>
                </span>
              </label>
              <label className={radio(effPayment === "pickup")}>
                <input type="radio" name="pay" className="accent-lemon" checked={effPayment === "pickup"} onChange={() => setPayment("pickup")} />
                <span>
                  <span className="block font-medium">Pay at pickup</span>
                  <span className="text-sm text-mute">Cash or UPI when you collect</span>
                </span>
              </label>
            </div>
          </fieldset>
        )}

        <Field label="Anything we should know? (optional)" name="notes" error={err("notes")}>
          <textarea {...aria("notes")} className="field min-h-24" maxLength={500} />
        </Field>
      </div>

      <aside className="ice h-fit space-y-4 rounded-[1.5rem] border border-line p-6 lg:sticky lg:top-28">
        <h2 className="display text-3xl">Order</h2>
        {q.status === "ready" ? (
          <>
            <ul className="space-y-3 text-sm">
              {q.quote.items.map((i) => (
                <li key={i.variantId} className="flex justify-between gap-3">
                  <span>
                    {i.name} <span className="text-mute">× {i.qty}</span>
                  </span>
                  <span className="tabular-nums">{formatINR(i.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>
            {q.quote.problems.length > 0 && (
              <p className="text-sm text-[#ff7a59]" role="alert">
                Some items changed.{" "}
                <Link href="/cart" className="underline">
                  Review your cart
                </Link>
                .
              </p>
            )}
            <div className="space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-paper/70">Subtotal</span>
                <span className="tabular-nums">{formatINR(q.quote.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/70">{effFulfilment === "pickup" ? "Pickup" : "Shipping"}</span>
                <span className="tabular-nums">{q.quote.shippingPaise ? formatINR(q.quote.shippingPaise) : "Free"}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <span>Total</span>
              <span className="text-2xl font-semibold tabular-nums text-lemon" data-testid="checkout-total">
                {formatINR(q.quote.totalPaise)}
              </span>
            </div>
            {q.quote.belowMinimum && (
              <p className="text-sm text-paper/80">Minimum order is {formatINR(q.options.minOrderPaise)}.</p>
            )}
          </>
        ) : q.status === "error" ? (
          <p className="text-sm text-[#ff7a59]">{q.error}</p>
        ) : (
          <p className="text-mute">Checking prices…</p>
        )}

        {formError && (
          <p className="rounded-xl bg-[#ff7a59]/10 p-3 text-sm text-[#ffb59f]" role="alert">
            {formError}
          </p>
        )}

        {q.status === "ready" && !q.options.storeOpen ? (
          <p className="text-sm text-paper/80">Online orders open soon. Message us on Instagram to order now.</p>
        ) : (
          <button
            type="submit"
            className="btn btn-primary w-full justify-center disabled:opacity-50"
            disabled={submitting || q.status !== "ready" || q.quote.problems.length > 0 || q.quote.belowMinimum}
          >
            {submitting ? "Placing order…" : effPayment === "upi" ? "Place order and pay" : "Place order"}
          </button>
        )}
        <p className="text-xs text-mute">
          By placing an order you agree to our{" "}
          <Link href="/policies/terms" className="underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/policies/returns" className="underline">
            returns policy
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}
