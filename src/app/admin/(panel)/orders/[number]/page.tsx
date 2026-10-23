import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/admin/order-form";
import { formatDate } from "@/components/admin/orders-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireAdmin();
  const order = await getStore().getOrder((await params).number);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-mute hover:text-lemon">
        ← Orders
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="display font-mono text-5xl">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-mute">
        Sent {formatDate(order.createdAt)}
        {order.customerName && <> by {order.customerName}</>}. Find the chat in WhatsApp by searching the ref.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-line">
          <ul className="divide-y divide-line">
            {order.lines.map((l, i) => (
              <li key={`${l.productId}-${i}`} className="flex gap-4 p-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-ink p-1.5">{l.image && <img src={l.image} alt="" className="max-h-full w-auto object-contain" />}</div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <Link href={`/admin/products/${l.productId}`} className="font-medium hover:text-lemon">
                      {l.qty} × {l.name}
                    </Link>
                    <span className="tabular-nums">{formatINR(l.lineTotalPaise)}</span>
                  </div>
                  {l.options.length > 0 && <p className="text-mute">{l.options.join(" · ")}</p>}
                  {l.custom.map((c) => (
                    <div key={c.label} className="mt-1">
                      <span className="text-mute">{c.label}: </span>
                      {c.kind === "image" ? (
                        <a href={c.value} target="_blank" rel="noopener" className="inline-block align-top">
                          <img src={c.value} alt={c.label} className="mt-1 size-28 rounded-lg object-cover ring-1 ring-line" />
                        </a>
                      ) : c.kind === "link" ? (
                        <a href={c.value} target="_blank" rel="noopener noreferrer" className="break-all text-lemon underline underline-offset-2">
                          {c.value}
                        </a>
                      ) : (
                        <span className="whitespace-pre-line">{c.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-line p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-mute">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(order.subtotalPaise)}</dd>
            </div>
            {order.offers.map((o) => (
              <div key={o.offerId} className="flex justify-between text-lemon">
                <dt>
                  {o.name} ({o.freeUnits} free)
                </dt>
                <dd className="tabular-nums">−{formatINR(o.discountPaise)}</dd>
              </div>
            ))}
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
          {order.customerNote && (
            <p className="border-t border-line p-4 text-sm">
              <span className="text-mute">Customer note: </span>
              {order.customerNote}
            </p>
          )}
        </section>
        <OrderForm order={order} />
      </div>
    </div>
  );
}
