"use client";

import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "./cart-context";
import { QtyStepper } from "./qty-stepper";

export function CartLines({ size = "md" }: { size?: "sm" | "md" }) {
  const { items, setQty, remove } = useCart();
  const thumb = size === "sm" ? "size-20" : "size-24";
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex gap-4 py-5">
          <Link href={`/shop/${item.slug}`} className={`grid ${thumb} shrink-0 place-items-center rounded-xl bg-ink p-2`}>
            {item.image && <img src={item.image} alt="" className="max-h-full w-auto object-contain" />}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/shop/${item.slug}`} className="font-medium hover:text-lemon">
              {item.name}
            </Link>
            {item.optionLabels.length > 0 && <p className="text-sm text-mute">{item.optionLabels.join(" · ")}</p>}
            {item.customDisplay.map((c) => (
              <p key={c.label} className="truncate text-sm text-mute">
                {c.label}: {c.kind === "image" ? "photo added" : c.value}
              </p>
            ))}
            <div className="mt-3 flex items-center justify-between gap-3">
              <QtyStepper value={item.qty} onChange={(q) => setQty(item.key, q)} label={item.name} />
              <p className="tabular-nums">{formatINR(item.unitPricePaise * item.qty)}</p>
            </div>
            <button type="button" onClick={() => remove(item.key)} className="mt-2 text-sm text-mute underline-offset-4 hover:text-paper hover:underline">
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
