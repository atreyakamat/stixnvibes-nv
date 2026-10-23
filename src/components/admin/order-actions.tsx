"use client";

import { useActionState, useState } from "react";
import { saveOrderDetailsAction, transitionOrderAction, type FormState } from "@/app/admin/actions";

const DANGER = new Set(["cancelled", "awaiting_payment"]);

export function OrderActions({ number, next }: { number: string; next: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(transitionOrderAction, {});
  const [note, setNote] = useState("");

  if (next.length === 0) return <p className="mt-3 text-sm text-paper/70">This order is complete. Nothing left to do.</p>;

  return (
    <form
      action={action}
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        const to = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        if (to === "cancelled" && !window.confirm("Cancel this order? Stock goes back to the shop.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="note" value={note} />
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s.value}
            type="submit"
            name="to"
            value={s.value}
            disabled={pending}
            className={`btn !py-2.5 disabled:opacity-50 ${DANGER.has(s.value) ? "btn-ghost" : "btn-primary"}`}
          >
            {s.value === "awaiting_payment" ? "Reject payment" : `Mark ${s.label.toLowerCase()}`}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">Note for the history (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note for the history (optional)" className="field !py-2.5 text-sm" />
      </label>
      {state.error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function OrderDetailsForm(props: { number: string; courier: string; trackingNumber: string; adminNote: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOrderDetailsAction, {});
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="number" value={props.number} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper/70">Courier</span>
          <input name="courier" defaultValue={props.courier} className="field !py-2.5" placeholder="India Post, Delhivery…" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper/70">Tracking number</span>
          <input name="trackingNumber" defaultValue={props.trackingNumber} className="field !py-2.5 font-mono" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-paper/70">Private note (customers never see this)</span>
        <textarea name="adminNote" defaultValue={props.adminNote} className="field min-h-20" maxLength={2000} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-ghost !py-2.5 disabled:opacity-50" disabled={pending}>
          Save
        </button>
        <span className="text-sm" role="status">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : state.message}
        </span>
      </div>
    </form>
  );
}
