import Link from "next/link";
import { OrdersTable } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";

const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p.days) === sp.days)?.days ?? 7;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const store = getStore();
  const [stats, orders, products, settings] = await Promise.all([
    store.stats(since.toISOString()),
    store.listOrders({ limit: 8 }),
    store.listProducts({ includeHidden: true }),
    store.getSettings(),
  ]);
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? "Deleted product";
  const conversion = stats.views ? ((stats.orders / stats.views) * 100).toFixed(1) : "0";
  const newOrders = orders.filter((o) => o.status === "new").length;
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.views));

  const cards = [
    { label: "Orders sent to WhatsApp", value: stats.orderClicks, hint: "Taps on Checkout on WhatsApp" },
    { label: "Order value", value: formatINR(stats.orderValuePaise), hint: `${stats.orders} orders, excluding cancelled` },
    { label: "Product views", value: stats.views, hint: `${conversion}% of views became an order` },
    { label: "Added to cart", value: stats.addToCart, hint: `${stats.askClicks} "Ask on WhatsApp" taps` },
  ];

  const unpriced = products.filter((p) => p.status === "live" && p.pricePaise === null).length;
  const warnings = [
    !settings.storeOpen && "Online orders are paused. Turn them on in Settings.",
    unpriced > 0 && `${unpriced} live product${unpriced === 1 ? " has" : "s have"} no price, so customers see "Ask on WhatsApp".`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl">Dashboard</h1>
        <nav className="flex gap-1 rounded-full bg-surface p-1 text-sm" aria-label="Period">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/admin?days=${p.days}`}
              aria-current={p.days === days ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 ${p.days === days ? "bg-lemon text-ink" : "text-paper/70 hover:text-paper"}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="rounded-xl border border-[#ffb020]/40 bg-[#ffb020]/10 px-4 py-3 text-sm">
              {w}
            </li>
          ))}
        </ul>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className="rounded-2xl border border-line p-5">
            <p className="text-sm text-mute">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums" data-testid={`stat-${c.label}`}>
              {c.value}
            </p>
            <p className="mt-1 text-xs text-mute">{c.hint}</p>
          </li>
        ))}
      </ul>

      {stats.daily.length > 1 && (
        <section aria-labelledby="daily" className="rounded-2xl border border-line p-5">
          <h2 id="daily" className="font-medium">
            Views and orders per day
          </h2>
          <ul className="mt-4 flex h-40 items-end gap-1">
            {stats.daily.map((d) => (
              <li key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.views} views, ${d.orders} orders`}>
                <span className="block rounded-t bg-paper/20" style={{ height: `${(d.views / maxDay) * 100}%` }} />
                {d.orders > 0 && <span className="mt-0.5 block h-1.5 rounded bg-lemon" />}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mute">Grey: views. Yellow mark: at least one order that day.</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Most viewed", rows: stats.topViewed.map((t) => ({ id: t.productId, n: `${t.count} views` })) },
          { title: "Most ordered", rows: stats.topOrdered.map((t) => ({ id: t.productId, n: `${t.qty} sold` })) },
        ].map((block) => (
          <section key={block.title} className="rounded-2xl border border-line p-5">
            <h2 className="font-medium">{block.title}</h2>
            {block.rows.length ? (
              <ol className="mt-3 divide-y divide-line text-sm">
                {block.rows.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 py-2">
                    <Link href={`/admin/products/${r.id}`} className="truncate hover:text-lemon">
                      {name(r.id)}
                    </Link>
                    <span className="shrink-0 tabular-nums text-mute">{r.n}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-mute">Nothing yet for this period.</p>
            )}
          </section>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="display text-3xl">
            Latest orders {newOrders > 0 && <span className="text-lemon">({newOrders} new)</span>}
          </h2>
          <Link href="/admin/orders" className="text-sm text-mute hover:text-lemon">
            All orders →
          </Link>
        </div>
        <OrdersTable orders={orders} />
      </section>
    </div>
  );
}
