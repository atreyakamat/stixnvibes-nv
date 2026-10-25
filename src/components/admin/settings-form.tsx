"use client";

import { useActionState, type ReactNode } from "react";
import { saveSettingsAction, type FormState } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";

function Text({ name, label, defaultValue, hint, area, ...rest }: { name: string; label: string; defaultValue: string; hint?: string; area?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-paper/70">{label}</span>
      {area ? (
        <textarea name={name} defaultValue={defaultValue} maxLength={rest.maxLength} placeholder={rest.placeholder} className="field min-h-20 !py-2.5" />
      ) : (
        <input name={name} defaultValue={defaultValue} className="field !py-2.5" {...rest} />
      )}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line p-5">
      <legend className="px-1 font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <Section title="Orders">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="storeOpen" defaultChecked={s.storeOpen} className="mt-1 size-4 accent-lemon" />
          <span>
            <span className="block">Take orders through the cart</span>
            <span className="text-sm text-mute">When off, products still show and every button becomes &ldquo;Ask on Instagram&rdquo;.</span>
          </span>
        </label>
        <Text name="instagramHandle" label="Instagram account orders go to" defaultValue={s.instagramHandle} placeholder="stixnvibes" hint="The username without the @. Customers DM this account with their order." />
        <Text name="orderNote" label="How payment and confirmation work (shown in the cart)" defaultValue={s.orderNote} area maxLength={300} />
        <Text
          name="freeShippingAbove"
          label="Free shipping above ₹ (blank = no free shipping)"
          defaultValue={s.freeShippingAbovePaise === null ? "" : String(s.freeShippingAbovePaise / 100)}
          inputMode="decimal"
          hint="Shown in the cart with a nudge, and in the order message."
        />
        <Text name="deliveryNote" label="Delivery note" defaultValue={s.deliveryNote} maxLength={200} placeholder="Dispatched within 2 days." />
        <Text name="bulkNote" label="Bulk orders note" defaultValue={s.bulkNote} area maxLength={300} />
      </Section>
      <Section title="Payments">
        <Text
          name="upiId"
          label="UPI ID for online payments (blank = don't show)"
          defaultValue={s.upiId}
          placeholder="stixnvibes@okicici"
          hint="Customers see a UPI QR with the exact amount on their order page. You check the payment in your bank app and mark the order paid."
        />
        <Text name="upiName" label="Name shown in the customer's UPI app" defaultValue={s.upiName} maxLength={60} />
      </Section>
      <Section title="Pricing">
        <Text
          name="mrpMarkupPercent"
          label="MRP markup % (blank = don't show an MRP)"
          defaultValue={s.mrpMarkupPercent === null ? "" : String(s.mrpMarkupPercent)}
          inputMode="numeric"
          hint="Shows a struck-through MRP of price + this %, rounded up to the rupee (₹10 at 20% shows MRP ₹12). Only use an MRP you really charge somewhere, like at stalls. A product's own 'was' price wins."
        />
      </Section>
      <Section title="Banner">
        <Text name="announcement" label="Banner message at the top of the shop (optional)" defaultValue={s.announcement} maxLength={200} placeholder="New anime collection just dropped!" />
      </Section>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
