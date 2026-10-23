"use client";

import { useActionState } from "react";
import { updateOrderAction, type FormState } from "@/app/admin/actions";
import { ORDER_STATUSES, type Order } from "@/lib/types";
import { STATUS_LABEL } from "./status-badge";

export function OrderForm({ order }: { order: Order }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateOrderAction, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line p-5">
      <input type="hidden" name="number" value={order.number} />
      <label className="block">
        <span className="mb-1.5 block text-sm text-paper/70">Status</span>
        <select name="status" defaultValue={order.status} className="field !py-2.5">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-paper/70">Private note (phone, address, courier, anything)</span>
        <textarea name="adminNote" defaultValue={order.adminNote} maxLength={2000} className="field min-h-32" />
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
