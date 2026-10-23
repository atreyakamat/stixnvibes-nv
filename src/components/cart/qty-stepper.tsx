"use client";

import { MAX_QTY_PER_LINE } from "@/lib/constants";

export function QtyStepper({
  value,
  onChange,
  label,
  max = MAX_QTY_PER_LINE,
}: {
  value: number;
  onChange: (qty: number) => void;
  label: string;
  max?: number;
}) {
  const btn =
    "grid size-9 place-items-center rounded-full text-lg transition-colors hover:bg-paper/10 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center gap-1 rounded-full ring-1 ring-line" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-7 text-center tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
