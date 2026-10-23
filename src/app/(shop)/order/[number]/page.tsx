import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { UpiPanel } from "@/components/checkout/upi-panel";
import { site, whatsappLink } from "@/content/site";
import { formatINR } from "@/lib/money";
import { tokenMatches } from "@/lib/orders/service";
import { STATUS_HELP, STATUS_LABEL } from "@/lib/orders/status";
import { buildUpiLink, isValidVpa } from "@/lib/payments/upi";
import { getStoreOrNull } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEPS_SHIP = ["Order placed", "Paid", "Packed", "Shipped", "Delivered"];
const STEPS_PICKUP = ["Order placed", "Packed", "Ready for pickup", "Collected"];

function stepIndex(status: string, pickup: boolean): number {
  const order: Record<string, number> = pickup
    ? { awaiting_payment: 0, payment_review: 0, placed: 0, paid: 0, packed: 1, ready_for_pickup: 2, collected: 3 }
    : { awaiting_payment: 0, payment_review: 0, placed: 0, paid: 1, packed: 2, shipped: 3, delivered: 4 };
  return order[status] ?? -1;
}

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[number]">) {
  const { number } = await params;
  const k = (await searchParams).k;
  const store = getStoreOrNull();
  const order = store ? await store.getOrderByNumber(number.toUpperCase()) : null;
  if (!order || typeof k !== "string" || !tokenMatches(order, k)) notFound();

  const settings = await store!.getSettings();
  const pickup = order.fulfilment === "pickup";
  const steps = pickup ? STEPS_PICKUP : STEPS_SHIP;
  const current = stepIndex(order.status, pickup);
  const needsPayment = order.paymentMethod === "upi" && ["awaiting_payment", "payment_review"].includes(order.status);

  let upi: { link: string; qrSvg: string } | null = null;
  if (needsPayment && settings.upiEnabled && isValidVpa(settings.upiVpa)) {
    const link = buildUpiLink({
      vpa: settings.upiVpa,
      payee: settings.upiPayee,
      amountPaise: order.totalPaise,
      orderNumber: order.number,
    });
    const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#070707", light: "#f5f5ef" } });
    upi = { link, qrSvg };
  }

  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Order {order.number}</p>
      <h1 className="display mt-4 text-[clamp(3rem,9vw,6.5rem)]" data-testid="order-status">
        {STATUS_LABEL[order.status]}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-paper/75">{STATUS_HELP[order.status]}</p>

      {order.status !== "cancelled" && current >= 0 && (
        <ol className="mt-10 grid gap-2 sm:flex sm:gap-0" aria-label="Order progress">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start">
              <span className={`h-1.5 w-10 rounded-full sm:w-full ${i <= current ? "bg-lemon" : "bg-line"}`} aria-hidden="true" />
              <span className={`text-sm ${i <= current ? "text-paper" : "text-mute"}`}>
                {s}
                {i === current && <span className="sr-only"> (current)</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          {needsPayment &&
            (upi ? (
              <UpiPanel
                number={order.number}
                token={order.accessToken}
                total={formatINR(order.totalPaise)}
                vpa={settings.upiVpa}
                link={upi.link}
                qrSvg={upi.qrSvg}
                submittedUtr={order.utr}
              />
            ) : (
              <div className="rounded-[1.5rem] border border-line p-6">
                <p>UPI payment is being set up. Message us and we&apos;ll send payment details for {order.number}.</p>
                <a href={whatsappLink(`Hi! I'd like to pay for order ${order.number}.`)} className="btn btn-primary mt-4" target="_blank" rel="noopener">
                  Message us on WhatsApp
                </a>
              </div>
            ))}

          {order.status === "shipped" && (order.courier || order.trackingNumber) && (
            <div className="rounded-[1.5rem] border border-line p-6">
              <h2 className="label text-mute">Tracking</h2>
              <p className="mt-2 text-lg">
                {order.courier} {order.trackingNumber && <span className="font-mono">{order.trackingNumber}</span>}
              </p>
            </div>
          )}

          <div>
            <h2 className="display text-3xl">Items</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {order.items.map((i) => (
                <li key={i.variantId} className="flex items-center gap-4 py-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface p-2">
                    {i.image && <img src={i.image} alt="" className="max-h-full w-auto object-contain" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-sm text-mute">
                      {i.variantLabel} · {i.qty} × {formatINR(i.unitPricePaise)}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatINR(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="ice h-fit space-y-3 rounded-[1.5rem] border border-line p-6 text-sm">
          <div className="flex justify-between">
            <span className="text-paper/70">Subtotal</span>
            <span className="tabular-nums">{formatINR(order.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-paper/70">{pickup ? "Pickup" : "Shipping"}</span>
            <span className="tabular-nums">{order.shippingPaise ? formatINR(order.shippingPaise) : "Free"}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3 text-base">
            <span>Total</span>
            <span className="text-2xl font-semibold tabular-nums text-lemon">{formatINR(order.totalPaise)}</span>
          </div>
          <div className="border-t border-line pt-3">
            <p className="label text-mute">{pickup ? "Pickup" : "Ship to"}</p>
            {pickup ? (
              <p className="mt-2 text-paper/80">{settings.pickupNote || "We'll message you with pickup details."}</p>
            ) : (
              order.address && (
                <address className="mt-2 not-italic text-paper/80">
                  {order.customer.name}
                  <br />
                  {order.address.line1}
                  {order.address.line2 && (
                    <>
                      <br />
                      {order.address.line2}
                    </>
                  )}
                  <br />
                  {order.address.city}, {order.address.state} {order.address.pincode}
                </address>
              )
            )}
          </div>
          <p className="border-t border-line pt-3 text-paper/70">
            Save this page to check your order later, or use{" "}
            <Link href="/track" className="underline hover:text-lemon">
              Track order
            </Link>{" "}
            with your order number and phone.
          </p>
          <a
            href={whatsappLink(`Hi! Question about my order ${order.number}.`)}
            className="btn btn-ghost w-full justify-center"
            target="_blank"
            rel="noopener"
          >
            Questions? WhatsApp us
          </a>
          <a href={site.contact.instagramDm} className="block text-center text-mute hover:text-lemon" target="_blank" rel="noopener">
            or DM {site.contact.instagramHandle}
          </a>
        </aside>
      </div>
    </section>
  );
}
