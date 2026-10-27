"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";
import { saveStallAction } from "@/app/admin/stall-actions";
import { paiseToRupees } from "@/lib/money";
import type { College, Stall } from "@/lib/types";

export function StallForm({ stall, colleges, today }: { stall?: Stall; colleges: Pick<College, "id" | "name">[]; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStallAction, {});
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      {stall && <input type="hidden" name="id" value={stall.id} />}
      <label className="block sm:col-span-2">
        <span className={lbl}>Name</span>
        <input name="name" required maxLength={120} defaultValue={stall?.name ?? ""} className="field !py-2 text-sm" placeholder="WordsUp fest" />
      </label>
      <label className="block">
        <span className={lbl}>Date</span>
        <input name="date" type="date" required defaultValue={stall?.date ?? today} className="field !py-2 text-sm" />
      </label>
      <label className="block">
        <span className={lbl}>College (optional)</span>
        <select name="collegeId" defaultValue={stall?.collegeId ?? ""} className="field !py-2 text-sm">
          <option value="">None</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={lbl}>Venue</span>
        <input name="venue" maxLength={160} defaultValue={stall?.venue ?? ""} className="field !py-2 text-sm" placeholder="St. Xavier's, Mapusa" />
      </label>
      <label className="block">
        <span className={lbl}>Stall fee ₹</span>
        <input name="fee" inputMode="decimal" defaultValue={stall ? paiseToRupees(stall.feePaise) : ""} className="field !py-2 text-sm tabular-nums" placeholder="1500" />
      </label>
      <label className="block">
        <span className={lbl}>Other costs ₹ (travel, table)</span>
        <input name="otherCosts" inputMode="decimal" defaultValue={stall ? paiseToRupees(stall.otherCostsPaise) : ""} className="field !py-2 text-sm tabular-nums" />
      </label>
      <label className="block sm:col-span-3">
        <span className={lbl}>Notes (private)</span>
        <input name="notes" maxLength={2000} defaultValue={stall?.notes ?? ""} className="field !py-2 text-sm" placeholder="Corner spot, busy after 4pm" />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="public" defaultChecked={stall?.public ?? true} className="size-4 accent-lemon" />
        Show on the shop
      </label>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button type="submit" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : stall ? "Save" : "Add stall"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
