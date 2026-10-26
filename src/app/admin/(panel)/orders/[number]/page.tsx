import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/admin/order-form";
import { formatDate } from "@/components/admin/orders-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { orderUrl } from "@/lib/orders";
import { formatPhone, telNumber } from "@/lib/phone";
import { getStore } from "@/lib/store";
import { addressText } from "@/lib/instagram";

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
        {order.customerName && <> by {order.customerName}</>}. Find the DM in Instagram by searching the ref. Confirm it only once that DM has come in, so made-up orders never reach InWoice.
      </p>

      <dl className="grid gap-4 rounded-2xl border border-line p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-mute">Customer</dt>
          <dd className="mt-1">
            {order.customerPhone ? (
              <Link href={`/admin/customers/${order.customerPhone}`} className="hover:text-lemon">
                {order.customerName || "No name"}
              </Link>
            ) : (
              order.customerName || <span className="text-mute">Not given</span>
            )}
            {order.customerPhone && (
              <span className="mt-1 flex flex-wrap gap-3">
                <a href={`tel:+${telNumber(order.customerPhone)}`} className="tabular-nums text-paper/70 hover:text-lemon">
                  {formatPhone(order.customerPhone)}
                </a>
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-mute">{order.fulfilment === "pickup" ? "Pickup at a stall" : "Deliver to"}</dt>
          <dd className="mt-1 whitespace-pre-line">{order.fulfilment === "pickup" ? "Customer picks up" : addressText(order.address) || <span className="text-mute">No address</span>}</dd>
        </div>
        {order.viewKey && (
          <div>
            <dt className="text-mute">Customer&apos;s order page</dt>
            <dd className="mt-1">
              <a href={orderUrl(order)} target="_blank" rel="noopener" className="break-all text-lemon underline underline-offset-2">
                Open
              </a>
              <span className="block text-xs text-mute">Shows status and the UPI QR. Share it if they lose the link.</span>
            </dd>
          </div>
        )}
      </dl>

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
                  {o.name}
                  {o.freeUnits > 0 && ` (${o.freeUnits} free)`}
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
