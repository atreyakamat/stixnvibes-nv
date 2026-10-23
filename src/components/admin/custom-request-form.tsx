"use client";

import { useActionState } from "react";
import { updateCustomAction, type FormState } from "@/app/admin/actions";
import { CUSTOM_STATUSES, type CustomStatus } from "@/lib/types";

const LABEL: Record<CustomStatus, string> = {
  new: "New",
  quoted: "Quote sent",
  accepted: "Accepted",
  done: "Done",
  declined: "Declined",
};

export function CustomRequestForm({ id, status, adminNote }: { id: string; status: CustomStatus; adminNote: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCustomAction, {});
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
      <input type="hidden" name="id" value={id} />
      <label className="text-sm">
        <span className="mb-1.5 block text-paper/70">Status</span>
        <select name="status" defaultValue={status} className="field !w-auto !py-2">
          {CUSTOM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-48 flex-1 text-sm">
        <span className="mb-1.5 block text-paper/70">Note (quote, price, follow-up)</span>
        <input name="adminNote" defaultValue={adminNote} className="field !py-2" maxLength={2000} />
      </label>
      <button type="submit" className="btn btn-ghost !py-2.5 disabled:opacity-50" disabled={pending}>
        Save
      </button>
      <span className="text-sm" role="status">
        {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : state.message}
      </span>
    </form>
  );
}
