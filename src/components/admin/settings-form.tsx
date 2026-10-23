"use client";

import { useActionState, type ReactNode } from "react";
import { saveSettingsAction, type FormState } from "@/app/admin/actions";
import { paiseToRupees } from "@/lib/money";
import type { Settings } from "@/lib/types";

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-lemon" />
      <span>
        <span className="block">{label}</span>
        {hint && <span className="text-sm text-mute">{hint}</span>}
      </span>
    </label>
  );
}

function Text({ name, label, defaultValue, hint, prefix, ...rest }: { name: string; label: string; defaultValue: string; hint?: string; prefix?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-paper/70">{label}</span>
      <span className="flex items-center gap-2">
        {prefix && <span className="text-mute">{prefix}</span>}
        <input name={name} defaultValue={defaultValue} className="field !py-2.5" {...rest} />
      </span>
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
      <Section title="Shop">
        <Toggle name="storeOpen" label="Take online orders" defaultChecked={s.storeOpen} hint="When off, products still show but customers are sent to Instagram." />
        <Text name="announcement" label="Banner message (optional)" defaultValue={s.announcement} maxLength={200} placeholder="Free stickers with every order this week!" />
        <Text name="minOrder" label="Minimum order" prefix="₹" defaultValue={paiseToRupees(s.minOrderPaise || null)} inputMode="decimal" placeholder="0" />
      </Section>

      <Section title="UPI payments">
        <Toggle name="upiEnabled" label="Accept UPI" defaultChecked={s.upiEnabled} hint="Customers scan a QR or tap to open their UPI app with the amount filled in." />
        <Text name="upiVpa" label="UPI ID" defaultValue={s.upiVpa} placeholder="stixnvibes@okaxis" autoCapitalize="none" spellCheck={false} />
        <Text name="upiPayee" label="Name shown in the UPI app" defaultValue={s.upiPayee} maxLength={50} />
      </Section>

      <Section title="Shipping">
        <Toggle name="shippingEnabled" label="Ship orders" defaultChecked={s.shippingEnabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="shippingFee" label="Shipping fee" prefix="₹" defaultValue={paiseToRupees(s.shippingFeePaise)} inputMode="decimal" />
          <Text name="freeShippingAbove" label="Free shipping above (blank = never)" prefix="₹" defaultValue={paiseToRupees(s.freeShippingAbovePaise)} inputMode="decimal" />
        </div>
        <Text name="shipsTo" label="Where you ship" defaultValue={s.shipsTo} placeholder="All India" maxLength={120} />
        <Text name="dispatchNote" label="Dispatch note" defaultValue={s.dispatchNote} placeholder="We dispatch within 2 days." maxLength={200} />
      </Section>

      <Section title="Pickup">
        <Toggle name="pickupEnabled" label="Offer free pickup (with pay at pickup)" defaultChecked={s.pickupEnabled} />
        <Text name="pickupNote" label="Pickup details shown to customers" defaultValue={s.pickupNote} placeholder="Collect at our next Sunday stall in Goa. We'll message you the spot." maxLength={200} />
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
