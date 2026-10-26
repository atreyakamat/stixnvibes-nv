"use client";

import { useActionState, useState } from "react";
import { saveCouponAction, type FormState } from "@/app/admin/actions";
import { isoToIstInput, paiseToRupees } from "@/lib/money";
import type { Coupon } from "@/lib/types";

/** Adds a code, or edits one (the code itself can't change). */
export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCouponAction, {});
  const [kind, setKind] = useState<"percent" | "amount">(coupon?.amountPaise != null ? "amount" : "percent");
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="isNew" value={coupon ? "0" : "1"} />
      <label className="block">
        <span className={lbl}>Code</span>
        {coupon ? (
          <>
            <input type="hidden" name="code" value={coupon.code} />
            <span className="field block !py-2 font-mono text-sm">{coupon.code}</span>
          </>
        ) : (
          <input name="code" required maxLength={20} className="field !py-2 font-mono text-sm uppercase" placeholder="WORDSUP10" />
        )}
      </label>
      <label className="block">
        <span className={lbl}>Type</span>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amount")} className="field !py-2 text-sm">
          <option value="percent">% off</option>
          <option value="amount">₹ off</option>
        </select>
      </label>
      <label className="block">
        <span className={lbl}>{kind === "percent" ? "% off" : "₹ off"}</span>
        <input
          name="value"
          inputMode="decimal"
          required
          defaultValue={coupon ? (coupon.percent !== null ? String(coupon.percent) : paiseToRupees(coupon.amountPaise)) : "10"}
          className="field !py-2 text-sm tabular-nums"
        />
      </label>
      <label className="block">
        <span className={lbl}>Min order ₹ (blank = none)</span>
        <input name="minOrder" inputMode="decimal" defaultValue={coupon?.minOrderPaise ? paiseToRupees(coupon.minOrderPaise) : ""} className="field !py-2 text-sm tabular-nums" />
      </label>
      <label className="block sm:col-span-2">
        <span className={lbl}>Where you hand it out (shows in Analytics)</span>
        <input name="source" defaultValue={coupon?.source ?? ""} maxLength={40} className="field !py-2 text-sm" placeholder="stall-wordsup" />
      </label>
      <label className="block">
        <span className={lbl}>Max uses (blank = no limit)</span>
        <input name="maxUses" inputMode="numeric" defaultValue={coupon?.maxUses ?? ""} className="field !py-2 text-sm tabular-nums" />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} className="size-4 accent-lemon" />
        Active
      </label>
      <label className="block sm:col-span-4">
        <span className={lbl}>Note for you (optional)</span>
        <input name="description" defaultValue={coupon?.description ?? ""} maxLength={160} className="field !py-2 text-sm" placeholder="10% off for WordsUp visitors" />
      </label>
      <label className="block sm:col-span-2">
        <span className={lbl}>Starts (India time, blank = now)</span>
        <input name="startsAt" type="datetime-local" defaultValue={isoToIstInput(coupon?.startsAt ?? null)} className="field !py-2 text-sm" />
      </label>
      <label className="block sm:col-span-2">
        <span className={lbl}>Ends (blank = no end)</span>
        <input name="endsAt" type="datetime-local" defaultValue={isoToIstInput(coupon?.endsAt ?? null)} className="field !py-2 text-sm" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button type="submit" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : coupon ? "Save" : "Add code"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
