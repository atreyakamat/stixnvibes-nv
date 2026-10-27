"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { saveCostsAction } from "@/app/admin/stall-actions";
import { paiseToRupees } from "@/lib/money";

export type CostRow = { key: string; label: string; indent: boolean };

/** Unit costs per type (and per size where it costs more), and the profit goal. */
export function CostsForm({ rows, costs, goal }: { rows: CostRow[]; costs: Record<string, number>; goal: { paise: number | null; start: string; by: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCostsAction, {});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, costs[r.key] === undefined ? "" : paiseToRupees(costs[r.key])])));
  const payload = JSON.stringify(rows.map((r) => ({ key: r.key, value: values[r.key] ?? "" })));
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="costs" value={payload} />
      <div className="space-y-1">
        <p className="text-sm text-paper/70">
          What one unit costs you to make. A product&apos;s own cost (on its edit page) beats these. A blank size uses its type&apos;s cost.
        </p>
      </div>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.key} className={`flex items-center justify-between gap-3 ${r.indent ? "pl-5 text-paper/70" : "font-medium"}`}>
            <label htmlFor={`cost-${r.key}`} className="text-sm">
              {r.label}
            </label>
            <span className="flex items-center gap-1 text-sm text-mute">
              ₹
              <input
                id={`cost-${r.key}`}
                value={values[r.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                inputMode="decimal"
                className="field w-24 !py-1.5 text-sm tabular-nums"
                placeholder={r.indent ? "same" : "not set"}
              />
            </span>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
        <label className="block">
          <span className={lbl}>Profit goal ₹ (blank = hide)</span>
          <input name="goal" inputMode="decimal" defaultValue={goal.paise === null ? "" : paiseToRupees(goal.paise)} className="field !py-2 text-sm tabular-nums" />
        </label>
        <label className="block">
          <span className={lbl}>Count from</span>
          <input name="goalStart" type="date" required defaultValue={goal.start} className="field !py-2 text-sm" />
        </label>
        <label className="block">
          <span className={lbl}>Reach it by</span>
          <input name="goalBy" type="date" required defaultValue={goal.by} className="field !py-2 text-sm" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : "Save costs and goal"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
