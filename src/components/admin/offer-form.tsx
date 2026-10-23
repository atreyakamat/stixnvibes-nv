"use client";

import { useActionState } from "react";
import { saveOfferAction, type FormState } from "@/app/admin/actions";
import { PRODUCT_TYPES, type Offer } from "@/lib/types";

export function OfferForm({ offer }: { offer?: Offer }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOfferAction, {});
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_9rem_5rem_5rem] sm:items-end">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <label className="block">
        <span className={lbl}>Name customers see</span>
        <input name="name" defaultValue={offer?.name ?? ""} required maxLength={80} className="field !py-2 text-sm" placeholder="Buy 4 stickers, get 1 free" />
      </label>
      <label className="block">
        <span className={lbl}>On</span>
        <select name="productType" defaultValue={offer?.productType ?? "sticker"} className="field !py-2 text-sm">
          <option value="">Everything</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={lbl}>Buy</span>
        <input name="buy" type="number" min={1} max={100} defaultValue={offer?.buy ?? 4} className="field !py-2 text-sm" />
      </label>
      <label className="block">
        <span className={lbl}>Get free</span>
        <input name="free" type="number" min={1} max={100} defaultValue={offer?.free ?? 1} className="field !py-2 text-sm" />
      </label>
      <label className="block sm:col-span-2">
        <span className={lbl}>Short description (optional)</span>
        <input name="description" defaultValue={offer?.description ?? ""} maxLength={200} className="field !py-2 text-sm" placeholder="Every 5th sticker is on us." />
      </label>
      <label className="block">
        <span className={lbl}>Order</span>
        <input name="sortOrder" type="number" defaultValue={offer?.sortOrder ?? 0} className="field !py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={offer?.active ?? true} className="size-4 accent-lemon" />
        Active
      </label>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button type="submit" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : offer ? "Save" : "Add offer"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
