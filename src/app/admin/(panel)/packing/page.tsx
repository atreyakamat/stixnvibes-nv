import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import { ShipForm } from "@/components/admin/ship-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin/session";
import { addressText } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { orderUrl } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { getStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Packing" };

function Slip({ o, children }: { o: Order; children?: React.ReactNode }) {
  return (
    <li className="break-inside-avoid space-y-3 rounded-2xl border border-line p-5 print:rounded-none print:border-black print:text-black">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/orders/${o.number}`} className="font-mono text-lg font-semibold hover:text-lemon">
          {o.number}
        </Link>
        <span className="print:hidden">
          <StatusBadge status={o.status} />
        </span>
        <span className="ml-auto tabular-nums">{formatINR(o.totalPaise)}</span>
      </div>
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-mute print:text-black">Ship to</p>
          <p className="mt-1 font-medium">{o.customerName}</p>
          <p className="whitespace-pre-line">{addressText(o.address)}</p>
          {o.customerPhone && <p className="tabular-nums">{formatPhone(o.customerPhone)}</p>}
        </div>
        <div>
          <p className="text-mute print:text-black">Pack</p>
          <ul className="mt-1 space-y-1">
            {o.lines.map((l, i) => (
              <li key={i}>
                <span className="font-medium tabular-nums">{l.qty} ×</span> {l.name}
                {l.options.length > 0 && <span className="text-mute print:text-black"> ({l.options.join(", ")})</span>}
                {l.custom.map((c) => (
                  <span key={c.label} className="block pl-5 text-xs text-mute print:text-black">
                    {c.label}: {c.kind === "image" ? "photo, see order" : c.value}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {o.customerNote && <p className="mt-2 text-xs">Note: {o.customerNote}</p>}
        </div>
      </div>
      {children}
    </li>
  );
}

export default async function PackingPage() {
  await requireAdmin();
  const orders = (await getStore().listOrders({ limit: 500 })).filter((o) => o.fulfilment === "delivery");
  const toPack = orders.filter((o) => o.status === "paid").reverse();
  const waiting = orders.filter((o) => o.status === "confirmed");
  const shipped = orders.filter((o) => o.status === "shipped").slice(0, 20);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="space-y-3">
          <h1 className="display text-5xl">Packing</h1>
          <p className="text-paper/70">
            Paid orders to post, oldest first. Print the slips, pack, then add the India Post number and mark each one shipped. The customer sees the number on
            their order page.
          </p>
        </div>
        {toPack.length > 0 && <PrintButton label="Print packing slips" />}
      </div>

      <section className="space-y-3">
        <h2 className="label text-mute print:hidden">To pack ({toPack.length})</h2>
        {toPack.length ? (
          <ul className="space-y-4">
            {toPack.map((o) => (
              <Slip key={o.id} o={o}>
                <ShipForm number={o.number} tracking={o.trackingNumber} pageUrl={o.viewKey ? orderUrl(o) : null} shipped={false} />
              </Slip>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">Nothing paid and waiting. Orders show up here once you mark them Paid.</p>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="space-y-3 print:hidden">
          <h2 className="label text-mute">Confirmed, not paid yet ({waiting.length})</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
            {waiting.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 p-3">
                <Link href={`/admin/orders/${o.number}`} className="font-mono hover:text-lemon">
                  {o.number}
                </Link>
                <span className="truncate text-mute">{o.customerName}</span>
                <span className="tabular-nums">{formatINR(o.totalPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shipped.length > 0 && (
        <section className="space-y-3 print:hidden">
          <h2 className="label text-mute">On its way</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
            {shipped.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-3 p-3">
                <Link href={`/admin/orders/${o.number}`} className="font-mono hover:text-lemon">
                  {o.number}
                </Link>
                <span className="truncate text-mute">{o.customerName}</span>
                <span className="font-mono">{o.trackingNumber || <span className="text-[#ffb020]">No tracking number</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
