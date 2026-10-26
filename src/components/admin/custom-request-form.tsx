"use client";

import { useActionState } from "react";
import { updateCustomRequestAction, type FormState } from "@/app/admin/actions";
import { CUSTOM_STATUSES, type CustomRequest } from "@/lib/types";

const LABEL = { new: "New", quoted: "Quoted", won: "Ordered", lost: "Didn't go ahead" } as const;

export function CustomRequestForm({ request }: { request: CustomRequest }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCustomRequestAction, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line p-5">
      <input type="hidden" name="number" value={request.number} />
      <label className="block">
        <span className="mb-1.5 block text-sm text-paper/70">Status</span>
        <select name="status" defaultValue={request.status} className="field !py-2.5">
          {CUSTOM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-paper/70">Private note (quote, price, deadline)</span>
        <textarea name="adminNote" defaultValue={request.adminNote} maxLength={2000} className="field min-h-32" />
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary !py-2.5 disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
