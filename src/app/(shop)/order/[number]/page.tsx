import type { Metadata } from "next";
import { INDIA_POST_TRACKING_URL } from "@/lib/shipping";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatINR } from "@/lib/money";
import { CopyAndDm, InstagramIcon } from "@/components/copy-and-dm";
import { PayPanel } from "@/components/order/pay-panel";
import { youpiConfig } from "@/lib/env";
import { awaitingPayment, messageFor, totalIsFinal, viewKeyMatches } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { getStoreOrNull } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";
import { upiLink } from "@/lib/upi";
import { addressText, dmLink } from "@/lib/instagram";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "new", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "paid", label: "Paid" },
  { status: "shipped", label: "On its way" },
  { status: "done", label: "Delivered" },
];

const NEXT: Record<OrderStatus, string> = {
  new: "Send the order to us on Instagram if you haven't yet. We'll reply to confirm it.",
  confirmed: "Confirmed. Pay below (or at the stall for pickups) and we'll start packing.",
  paid: "Paid, thank you. We're packing your order.",
  shipped: "Your order is on its way.",
  done: "Delivered. Enjoy, and tag us @stixnvibes!",
  cancelled: "This order was cancelled. Message us if that's a surprise.",
};

function Steps({ order }: { order: Order }) {
  if (order.status === "cancelled") return null;
  const at = STEPS.findIndex((s) => s.status === order.status);
  const steps = order.fulfilment === "pickup" ? STEPS.map((s) => (s.status === "shipped" ? { ...s, label: "Ready to pick up" } : s.status === "done" ? { ...s, label: "Picked up" } : s)) : STEPS;
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Order progress">
      {steps.map((s, i) => (
        <li key={s.status} aria-current={i === at ? "step" : undefined}>
          <span className={`block h-1.5 rounded-full ${i <= at ? "bg-lemon" : "bg-line"}`} />
          <span className={`mt-2 block text-xs ${i === at ? "text-lemon" : i < at ? "text-paper/70" : "text-mute"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const key = typeof sp.k === "string" ? sp.k : undefined;
  const store = getStoreOrNull();
  const order = store ? await store.getOrder(number.toUpperCase()).catch(() => null) : null;
  // Wrong or missing key looks exactly like a missing order.
  if (!store || !order || !viewKeyMatches(order, key)) notFound();
  const settings = await store.getSettings();

  const message = messageFor(order, settings.freeShippingAbovePaise);
  const handle = settings.instagramHandle;
  const shippingKnown = totalIsFinal(order, settings.freeShippingAbovePaise);
  const unpaid = awaitingPayment(order);
  const online = unpaid && shippingKnown && youpiConfig() !== null;
  const upi =
    unpaid && settings.upiId
      ? upiLink({ upiId: settings.upiId, name: settings.upiName || "Stix N Vibes", amountPaise: shippingKnown ? order.totalPaise : null, note: `Stix N Vibes ${order.number}` })
      : null;
  const qrColors = { dark: "#0b0b0a", light: "#f5f5ef" };
  const qr = upi
    ? {
        svg: await QRCode.toString(upi, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: qrColors }),
        // A bigger PNG to save, with a white margin so any UPI app can scan it from the gallery.
        png: await QRCode.toDataURL(upi, { width: 720, margin: 3, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }),
        link: upi,
        upiId: settings.upiId,
        amountFixed: shippingKnown,
      }
    : null;
  const whatsapp =
    unpaid && settings.whatsappNumber
      ? `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(`Hi! I paid for order ${order.number} (${formatINR(order.totalPaise)}). Screenshot attached.`)}`
      : null;
  const fresh = sp.new === "1" && order.status === "new";

  return (
    <section className="container-x max-w-3xl pt-10 md:pt-16">
      <p className="label text-mute">Order</p>
      <h1 className="display mt-2 font-mono text-[clamp(2.6rem,9vw,4.5rem)]">{order.number}</h1>
      <p className="mt-2 text-sm text-mute">
        Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}. Bookmark this page to check on your order.
      </p>

      <div className="mt-8 space-y-4 rounded-[1.5rem] border border-line p-5 md:p-6">
        <Steps order={order} />
        <p className="text-paper/80">{NEXT[order.status]}</p>
        {order.trackingNumber && order.fulfilment === "delivery" && (
          <p className="rounded-xl bg-paper/5 px-4 py-3 text-sm" data-testid="tracking">
            Sent by India Post. Tracking number <span className="select-all font-mono text-lemon">{order.trackingNumber}</span>.{" "}
            <a href={INDIA_POST_TRACKING_URL} target="_blank" rel="noopener" className="underline underline-offset-2">
              Track it on India Post
            </a>{" "}
            (paste the number there).
          </p>
        )}
        {order.status === "new" && (
          <>
            {fresh && (
              <p className="font-medium text-lemon">
                Last step: send it to us on Instagram. We copy your order, you paste it in the chat with @{handle}.
              </p>
            )}
            <CopyAndDm
              handle={handle}
              message={message}
              label={fresh ? "Copy order & open Instagram" : "Copy order & message us"}
              className={`btn w-full justify-center ${fresh ? "btn-primary" : "btn-ghost"}`}
            />
          </>
        )}
      </div>

      <PayPanel
        number={order.number}
        viewKey={key ?? ""}
        amount={formatINR(order.totalPaise)}
        online={online}
        returning={sp.paid === "1" && unpaid}
        qr={qr}
        whatsapp={whatsapp}
      />

      <div className="mt-6 rounded-[1.5rem] border border-line">
        <ul className="divide-y divide-line">
          {order.lines.map((l, i) => (
            <li key={`${l.productId}-${i}`} className="flex gap-4 p-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-ink p-1.5">{l.image && <img src={l.image} alt="" className="max-h-full w-auto object-contain" />}</div>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex justify-between gap-3">
                  <Link href={`/shop/${l.slug}`} className="font-medium hover:text-lemon">
                    {l.qty} × {l.name}
                  </Link>
                  <span className="tabular-nums">{formatINR(l.lineTotalPaise)}</span>
                </div>
                {l.options.length > 0 && <p className="text-mute">{l.options.join(" · ")}</p>}
                {l.custom.filter((c) => c.kind !== "image").map((c) => (
                  <p key={c.label} className="break-words text-mute">
                    {c.label}: {c.value}
                  </p>
                ))}
                {l.custom.some((c) => c.kind === "image") && <p className="text-mute">Your photo is with us.</p>}
              </div>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-line p-4 text-sm">
          {order.discountPaise > 0 && (
            <>
              <div className="flex justify-between">
                <dt className="text-mute">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(order.subtotalPaise)}</dd>
              </div>
              {order.offers.map((o) => (
                <div key={o.offerId} className="flex justify-between gap-3 text-lemon">
                  <dt>{o.name}</dt>
                  <dd className="tabular-nums">−{formatINR(o.discountPaise)}</dd>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(order.totalPaise)}</dd>
          </div>
        </dl>
      </div>

      <dl className="mt-6 grid gap-4 rounded-[1.5rem] border border-line p-5 text-sm sm:grid-cols-2 md:p-6">
        <div>
          <dt className="label text-mute">For</dt>
          <dd className="mt-1">
            {order.customerName}
            {order.customerPhone && <span className="block text-mute">{formatPhone(order.customerPhone)}</span>}
          </dd>
        </div>
        <div>
          <dt className="label text-mute">{order.fulfilment === "pickup" ? "Pickup" : "Deliver to"}</dt>
          <dd className="mt-1">{order.fulfilment === "pickup" ? "At a Stix N Vibes stall. We'll tell you where on Instagram." : addressText(order.address)}</dd>
        </div>
        {order.customerNote && (
          <div className="sm:col-span-2">
            <dt className="label text-mute">Note</dt>
            <dd className="mt-1 whitespace-pre-line">{order.customerNote}</dd>
          </div>
        )}
      </dl>

      <a href={`/receipt/${order.number}?k=${encodeURIComponent(key ?? "")}`} className="btn btn-ghost mt-6 !py-2.5 text-sm">
        Download receipt
      </a>

      <p className="mt-6 text-sm text-mute">
        Questions?{" "}
        <a href={dmLink(handle)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-lemon underline underline-offset-2">
          <InstagramIcon className="size-4" />
          Message us on Instagram
        </a>{" "}
        with your order ref {order.number}.
      </p>
    </section>
  );
}
