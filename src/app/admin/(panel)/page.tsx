import Link from "next/link";
import { OrdersTable } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { fromPrice } from "@/lib/orders/pricing";
import { revenueSince } from "@/lib/orders/stats";
import { getStore } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export default async function Dashboard() {
  await requireAdmin();
  const store = getStore();
  const [orders, products, custom, settings] = await Promise.all([
    store.listOrders({ limit: 500 }),
    store.listProducts({ includeInactive: true }),
    store.listCustomRequests(),
    store.getSettings(),
  ]);

  const revenue = (days: number) => revenueSince(orders, days);
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;

  const todo = [
    { label: "Payments to check", n: count("payment_review"), href: "/admin/orders?status=payment_review" },
    { label: "Paid, to pack", n: count("paid"), href: "/admin/orders?status=paid" },
    { label: "Pickup orders to pack", n: count("placed"), href: "/admin/orders?status=placed" },
    { label: "Packed, to send", n: count("packed"), href: "/admin/orders?status=packed" },
    { label: "New custom requests", n: custom.filter((c) => c.status === "new").length, href: "/admin/custom" },
  ];

  const unpriced = products.filter((p) => p.active && fromPrice(p) === null).length;
  const warnings = [
    !settings.storeOpen && "The shop is closed for online orders. Open it in Settings.",
    !settings.upiEnabled && "UPI payments are off. Add your UPI ID in Settings.",
    unpriced > 0 && `${unpriced} active product${unpriced === 1 ? " has" : "s have"} no price yet, so customers can't buy them.`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-10">
      <h1 className="display text-5xl">Dashboard</h1>

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="rounded-xl border border-[#ffb020]/40 bg-[#ffb020]/10 px-4 py-3 text-sm">
              {w}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="todo">
        <h2 id="todo" className="label text-mute">
          To do
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {todo.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className={`block rounded-2xl border p-5 transition-colors hover:border-lemon ${t.n ? "border-lemon/50 bg-lemon/5" : "border-line"}`}
              >
                <p className="text-4xl font-semibold tabular-nums">{t.n}</p>
                <p className="mt-1 text-sm text-paper/70">{t.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="money">
        <h2 id="money" className="label text-mute">
          Money in (paid orders)
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Last 24 hours", revenue(1)],
            ["Last 7 days", revenue(7)],
            ["Last 30 days", revenue(30)],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-2xl border border-line p-5">
              <dt className="text-sm text-paper/70">{label}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatINR(v as number)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="recent">
        <div className="flex items-baseline justify-between">
          <h2 id="recent" className="label text-mute">
            Latest orders
          </h2>
          <Link href="/admin/orders" className="text-sm text-mute hover:text-lemon">
            All orders →
          </Link>
        </div>
        <div className="mt-3">
          <OrdersTable orders={orders.slice(0, 8)} />
        </div>
      </section>
    </div>
  );
}
