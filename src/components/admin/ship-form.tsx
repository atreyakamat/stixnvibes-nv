"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { shipOrderAction } from "@/app/admin/stall-actions";
import { cleanTracking, INDIA_POST_TRACKING_URL } from "@/lib/shipping";

/** India Post tracking number, with "mark shipped" and a message to send the customer. */
export function ShipForm({ number, tracking, pageUrl, shipped }: { number: string; tracking: string; pageUrl: string | null; shipped: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(shipOrderAction, {});
  const [value, setValue] = useState(tracking);
  const [copied, setCopied] = useState(false);
  const message = [
    `Your Stix N Vibes order ${number} is on its way by India Post.`,
    value && `Tracking number: ${value}`,
    value && `Track it here: ${INDIA_POST_TRACKING_URL}`,
    pageUrl && `Your order page: ${pageUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <form action={action} className="space-y-3 print:hidden">
      <input type="hidden" name="number" value={number} />
      <label className="block">
        <span className="mb-1 block text-xs text-paper/60">India Post tracking number</span>
        <input
          name="trackingNumber"
          value={value}
          onChange={(e) => setValue(cleanTracking(e.target.value))}
          maxLength={40}
          className="field !py-2 font-mono text-sm uppercase"
          placeholder="EE123456789IN"
          aria-label={`Tracking number for ${number}`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {!shipped && (
          <button type="submit" name="markShipped" value="1" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending}>
            Save &amp; mark shipped
          </button>
        )}
        <button type="submit" name="markShipped" value="0" className="btn btn-ghost !py-2 text-sm disabled:opacity-50" disabled={pending}>
          Save number
        </button>
        <button
          type="button"
          className="btn btn-ghost !py-2 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt("Copy this:", message);
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy message for customer"}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}
