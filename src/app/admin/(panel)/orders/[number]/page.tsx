import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions, OrderDetailsForm } from "@/components/admin/order-actions";
import { formatDate } from "@/components/admin/orders-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { nextStatuses, STATUS_LABEL } from "@/lib/orders/status";
import { getStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  return { title: (await params).number };
}

function customerMessage(o: Order): string {
  const link = `${site.url}/order/${o.number}?k=${o.accessToken}`;
  const hi = `Hi ${o.customer.name.split(" ")[0]}! Stix N Vibes here about order ${o.number}.`;
  switch (o.status) {
    case "awaiting_payment":
      return `${hi} Your order is waiting for payment of ${formatINR(o.totalPaise)}. You can pay here: ${link}`;
    case "payment_review":
      return `${hi} We couldn't match your UPI reference yet. Could you send a screenshot of the payment?`;
    case "paid":
      return `${hi} Payment received, thank you! We'll pack your order next. ${link}`;
    case "placed":
      return `${hi} Got your order! We'll message you when it's ready to collect. ${link}`;
    case "packed":
      return `${hi} Your order is packed. ${link}`;
    case "shipped":
      return `${hi} Your order is on its way${o.courier ? ` with ${o.courier}` : ""}${o.trackingNumber ? ` (tracking ${o.trackingNumber})` : ""}. ${link}`;
    case "ready_for_pickup":
      return `${hi} Your order is ready to collect! ${link}`;
    default:
      return `${hi} ${link}`;
  }
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireAdmin();
  const { number } = await params;
  const order = await getStore().getOrderByNumber(number);
  if (!order) notFound();

  const wa = `https://wa.me/91${order.customer.phone}?text=${encodeURIComponent(customerMessage(order))}`;
  const addressText = order.address
    ? [order.customer.name, order.address.line1, order.address.line2, `${order.address.city}, ${order.address.state} ${order.address.pincode}`, order.customer.phone]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/orders" className="text-sm text-mute hover:text-lemon">
          ← Orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="display font-mono text-5xl">{order.number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-mute">
          Placed {formatDate(order.createdAt)} · {order.fulfilment === "pickup" ? "Pickup" : "Ship"} ·{" "}
          {order.paymentMethod === "upi" ? "UPI" : "Pay at pickup"}
        </p>
      </div>

      {order.status === "payment_review" && (
        <div className="rounded-2xl border border-[#ffb020]/50 bg-[#ffb020]/10 p-5">
          <p className="font-medium">Check this payment in your bank or UPI app</p>
          <p className="mt-2 text-sm text-paper/80">
            Look for <strong>{formatINR(order.totalPaise)}</strong> with UTR / reference{" "}
            <span className="font-mono text-lemon">{order.utr}</span>. If it&apos;s there, mark it paid. If not, send it back to
            &ldquo;Awaiting payment&rdquo; so the customer can fix it.
          </p>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-line p-5">
            <h2 className="label text-mute">Move order</h2>
            <OrderActions number={order.number} next={nextStatuses(order).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </section>

          <section className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="border-b border-line text-mute">
                <tr>
                  <th className="px-4 py-3 font-normal">Item</th>
                  <th className="px-4 py-3 text-right font-normal">Qty</th>
                  <th className="px-4 py-3 text-right font-normal">Each</th>
                  <th className="px-4 py-3 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((i) => (
                  <tr key={i.variantId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {i.image && <img src={i.image} alt="" className="size-10 object-contain" />}
                        <span>
                          {i.name}
                          <span className="block text-xs text-mute">{i.variantLabel}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(i.unitPricePaise)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(i.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-mute">Subtotal</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(order.subtotalPaise)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-mute">Shipping</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(order.shippingPaise)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right font-medium">Total</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-lemon">{formatINR(order.totalPaise)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="rounded-2xl border border-line p-5">
            <h2 className="label text-mute">Shipping and notes</h2>
            <OrderDetailsForm
              number={order.number}
              courier={order.courier ?? ""}
              trackingNumber={order.trackingNumber ?? ""}
              adminNote={order.adminNote}
            />
          </section>

          <section>
            <h2 className="label text-mute">History</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="flex flex-wrap gap-x-3">
                  <span className="text-mute">{formatDate(e.at)}</span>
                  <span>{STATUS_LABEL[e.status]}</span>
                  <span className="text-mute">by {e.by}</span>
                  {e.note && <span className="text-paper/70">· {e.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-line p-5 text-sm">
          <div>
            <h2 className="label text-mute">Customer</h2>
            <p className="mt-2 text-base">{order.customer.name}</p>
            <p>
              <a href={`tel:+91${order.customer.phone}`} className="hover:text-lemon">
                +91 {order.customer.phone}
              </a>
            </p>
            {order.customer.email && (
              <p>
                <a href={`mailto:${order.customer.email}`} className="hover:text-lemon">
                  {order.customer.email}
                </a>
              </p>
            )}
            {order.customer.instagram && (
              <p>
                <a href={`https://instagram.com/${order.customer.instagram}`} target="_blank" rel="noopener" className="hover:text-lemon">
                  @{order.customer.instagram}
                </a>
              </p>
            )}
            <a href={wa} target="_blank" rel="noopener" className="btn btn-primary mt-4 w-full justify-center !py-3">
              WhatsApp customer
            </a>
            <p className="mt-2 text-xs text-mute">Opens WhatsApp with a message for this status. Edit before sending.</p>
          </div>
          {order.utr && (
            <div>
              <h2 className="label text-mute">UPI reference</h2>
              <p className="mt-2 font-mono text-base text-lemon">{order.utr}</p>
            </div>
          )}
          {addressText && (
            <div>
              <h2 className="label text-mute">Ship to</h2>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-paper/90">{addressText}</pre>
            </div>
          )}
          {order.notes && (
            <div>
              <h2 className="label text-mute">Customer note</h2>
              <p className="mt-2 whitespace-pre-line text-paper/90">{order.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
