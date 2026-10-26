import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { site } from "@/content/site";
import { addressText } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { viewKeyMatches } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { getStoreOrNull } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Receipt", robots: { index: false, follow: false } };

const PAID: OrderStatus[] = ["paid", "shipped", "done"];
const STATUS: Record<OrderStatus, string> = {
  new: "Placed, not paid yet",
  confirmed: "Confirmed, not paid yet",
  paid: "Paid",
  shipped: "Paid, on its way",
  done: "Paid, delivered",
  cancelled: "Cancelled",
};

// A plain black-on-white copy of the order to print or save as PDF.
// Same private link rule as the order page.
export default async function ReceiptPage({ params, searchParams }: PageProps<"/receipt/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const key = typeof sp.k === "string" ? sp.k : undefined;
  const store = getStoreOrNull();
  const order = store ? await store.getOrder(number.toUpperCase()).catch(() => null) : null;
  if (!store || !order || !viewKeyMatches(order, key)) notFound();
  const paid = PAID.includes(order.status);
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="mx-auto max-w-2xl px-6 py-10 print:p-0">
        <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
          <a href={`/order/${order.number}?k=${encodeURIComponent(key ?? "")}`} className="text-sm underline underline-offset-2">
            ← Back to your order
          </a>
          <PrintButton label="Download PDF" />
        </div>
        <header className="flex items-start justify-between gap-6 border-b border-black/20 pb-6">
          <div>
            <p className="text-2xl font-bold">{site.name}</p>
            <p className="text-sm text-black/60">{site.url.replace(/^https?:\/\//, "")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-wide text-black/60">{paid ? "Receipt" : "Order summary"}</p>
            <p className="font-mono text-lg font-semibold">{order.number}</p>
            <p className="text-sm text-black/60">{date(order.createdAt)}</p>
          </div>
        </header>

        <dl className="grid gap-4 py-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-black/60">For</dt>
            <dd>
              {order.customerName}
              <br />
              {formatPhone(order.customerPhone)}
            </dd>
          </div>
          <div>
            <dt className="text-black/60">{order.fulfilment === "pickup" ? "Pickup" : "Deliver to"}</dt>
            <dd>{order.fulfilment === "pickup" ? "At a Stix N Vibes stall" : addressText(order.address)}</dd>
          </div>
        </dl>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/20 text-left text-black/60">
              <th className="py-2 font-normal">Item</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={`${l.productId}-${i}`} className="border-b border-black/10 align-top">
                <td className="py-2 pr-3">
                  {l.name}
                  {l.options.length > 0 && <span className="block text-black/60">{l.options.join(" · ")}</span>}
                </td>
                <td className="py-2 text-right tabular-nums">{l.qty}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(l.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          {order.discountPaise > 0 && (
            <>
              <div className="flex justify-between">
                <dt className="text-black/60">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(order.subtotalPaise)}</dd>
              </div>
              {order.offers.map((o) => (
                <div key={o.offerId} className="flex justify-between gap-3">
                  <dt className="text-black/60">{o.name}</dt>
                  <dd className="tabular-nums">−{formatINR(o.discountPaise)}</dd>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between border-t border-black/20 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(order.totalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-black/60">Status</dt>
            <dd data-testid="receipt-status">{STATUS[order.status]}</dd>
          </div>
        </dl>

        <p className="mt-10 text-xs text-black/60">
          Thank you for shopping with {site.name}. Questions? Message us with your order ref {order.number}.
        </p>
      </div>
    </div>
  );
}
