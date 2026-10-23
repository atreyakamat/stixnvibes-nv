"use client";

import { useActionState, useState } from "react";
import { saveOfferAction, type FormState } from "@/app/admin/actions";
import { isoToIstInput, paiseToRupees } from "@/lib/money";
import { PRODUCT_TYPES, type Offer, type OfferKind } from "@/lib/types";

const PLACEHOLDER: Record<OfferKind, { name: string; description: string }> = {
  bxgy: { name: "Buy 4 stickers, get 1 free", description: "Every 5th sticker is on us." },
  volume: { name: "6+ wall cards at ₹25 each", description: "Bulk price on wall cards." },
  percent: { name: "Diwali sale: 15% off", description: "Festive prices on everything." },
};

/**
 * One offer. `offer` edits a saved one; `preset` pre-fills a new one (from a
 * campaign template) without an id.
 */
export function OfferForm({ offer, preset }: { offer?: Offer; preset?: Partial<Offer> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOfferAction, {});
  const init = offer ?? preset;
  const [kind, setKind] = useState<OfferKind>(init?.kind ?? "bxgy");
  const lbl = "mb-1 block text-xs text-paper/60";
  const volume = kind === "volume";
  const percent = kind === "percent";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem] sm:items-end">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <label className="block">
        <span className={lbl}>Name customers see</span>
        <input name="name" defaultValue={init?.name ?? ""} required maxLength={80} className="field !py-2 text-sm" placeholder={PLACEHOLDER[kind].name} />
      </label>
      <label className="block">
        <span className={lbl}>Type of offer</span>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as OfferKind)} className="field !py-2 text-sm">
          <option value="bxgy">Buy X, get Y free</option>
          <option value="volume">Bulk price</option>
          <option value="percent">% off (sale)</option>
        </select>
      </label>
      <label className="block">
        <span className={lbl}>On</span>
        <select name="productType" defaultValue={init?.productType ?? (init ? "" : "sticker")} className="field !py-2 text-sm">
          <option value="">Everything</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-3 sm:col-span-3 sm:grid-cols-[8rem_8rem_8rem_1fr] sm:items-end">
        {percent ? (
          <label className="block">
            <span className={lbl}>% off</span>
            <input name="percent" type="number" min={1} max={90} defaultValue={init?.percent ?? 10} required className="field !py-2 text-sm" />
          </label>
        ) : (
          <label className="block">
            <span className={lbl}>{volume ? "From quantity" : "Buy"}</span>
            <input name="buy" type="number" min={1} max={100} defaultValue={init?.buy ?? (volume ? 6 : 4)} className="field !py-2 text-sm" />
          </label>
        )}
        {volume && (
          <label className="block">
            <span className={lbl}>Price each ₹</span>
            <input name="price" inputMode="decimal" defaultValue={paiseToRupees(init?.pricePaise ?? null)} required className="field !py-2 text-sm" />
          </label>
        )}
        {kind === "bxgy" && (
          <label className="block">
            <span className={lbl}>Get free</span>
            <input name="free" type="number" min={1} max={100} defaultValue={init?.free ?? 1} className="field !py-2 text-sm" />
          </label>
        )}
        <label className="block">
          <span className={lbl}>Order</span>
          <input name="sortOrder" type="number" defaultValue={init?.sortOrder ?? 0} className="field !py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={init?.active ?? true} className="size-4 accent-lemon" />
          Active
        </label>
      </div>
      <label className="block sm:col-span-3">
        <span className={lbl}>Short description (optional)</span>
        <input name="description" defaultValue={init?.description ?? ""} maxLength={200} className="field !py-2 text-sm" placeholder={PLACEHOLDER[kind].description} />
      </label>
      <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
        <label className="block">
          <span className={lbl}>Starts (India time, blank = now)</span>
          <input name="startsAt" type="datetime-local" defaultValue={isoToIstInput(init?.startsAt ?? null)} className="field !py-2 text-sm" />
        </label>
        <label className="block">
          <span className={lbl}>Ends (blank = no end)</span>
          <input name="endsAt" type="datetime-local" defaultValue={isoToIstInput(init?.endsAt ?? null)} className="field !py-2 text-sm" />
        </label>
      </div>
      <label className="block sm:col-span-3">
        <span className={lbl}>Banner at the top of the shop while it runs (% off offers only, optional)</span>
        <input name="banner" defaultValue={init?.banner ?? ""} maxLength={160} disabled={!percent} className="field !py-2 text-sm disabled:opacity-40" placeholder="Diwali sale: 15% off everything!" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
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
