import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";
import { typeLabel } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

const pct = (n: number, of: number) => (of > 0 ? `${((n / of) * 100).toFixed(n / of < 0.1 ? 1 : 0)}%` : "–");

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p.days) === sp.days)?.days ?? 30;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const store = getStore();
  const [s, products] = await Promise.all([store.stats(since.toISOString()), store.listProducts({ includeHidden: true })]);
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? "Deleted product";
  const low = products.filter((p) => p.stock !== null && p.status !== "hidden" && p.stock <= p.lowStockAt).sort((a, b) => a.stock! - b.stock!);

  const funnel = [
    { label: "Visits", n: s.visits, hint: "Browser sessions that opened the shop" },
    { label: "Product views", n: s.views, hint: "Product pages opened" },
    { label: "Added to cart", n: s.addToCart, hint: "Taps on Add to cart" },
    { label: "Opened checkout", n: s.checkouts, hint: "The cart page with the details form" },
    { label: "Placed an order", n: s.orders, hint: "Orders not cancelled" },
    { label: "Confirmed", n: s.sales, hint: "You confirmed it after their DM" },
    { label: "Paid", n: s.paid, hint: "Marked paid" },
  ];
  const top = Math.max(1, ...funnel.map((f) => f.n));
  const maxSales = Math.max(1, ...s.daily.map((d) => d.salesPaise));
  const maxVisits = Math.max(1, ...s.daily.map((d) => d.visits));

  const cards = [
    { label: "Sales", value: formatINR(s.salesPaise), hint: `${s.sales} confirmed orders` },
    { label: "Average order", value: s.sales ? formatINR(Math.round(s.salesPaise / s.sales)) : "–", hint: "Confirmed orders only" },
    { label: "Visit to order", value: pct(s.orders, s.visits), hint: `${s.orders} orders from ${s.visits} visits` },
    { label: "Waiting on you", value: formatINR(s.orderValuePaise - s.salesPaise), hint: `${s.orders - s.sales} placed, not confirmed yet` },
  ];

  const th = "p-3 text-left font-normal";
  const td = "p-3 tabular-nums";

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Analytics</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">Online shop only. Cash and UPI at the stall aren&apos;t counted here. No cookies: a visit is one browser session.</p>
        </div>
        <nav className="flex gap-1 rounded-full bg-surface p-1 text-sm" aria-label="Period">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/admin/analytics?days=${p.days}`}
              aria-current={p.days === days ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 ${p.days === days ? "bg-lemon text-ink" : "text-paper/70 hover:text-paper"}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className="rounded-2xl border border-line p-5">
            <p className="text-sm text-mute">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums" data-testid={`kpi-${c.label}`}>
              {c.value}
            </p>
            <p className="mt-1 text-xs text-mute">{c.hint}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="funnel" className="rounded-2xl border border-line p-5">
        <h2 id="funnel" className="font-medium">
          From visit to paid
        </h2>
        <p className="mt-1 text-xs text-mute">Each step shows the share of the step before it.</p>
        <ol className="mt-4 space-y-2">
          {funnel.map((f, i) => (
            <li key={f.label} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_6rem]" title={f.hint}>
              <span>{f.label}</span>
              <span className="h-6 overflow-hidden rounded bg-paper/5">
                <span className="block h-full rounded bg-lemon/80" style={{ width: `${(f.n / top) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums" data-testid={`funnel-${f.label}`}>
                {f.n}
                {i > 0 && <span className="block text-xs text-mute">{pct(f.n, funnel[i - 1].n)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {s.daily.length > 1 && (
        <section aria-labelledby="daily" className="rounded-2xl border border-line p-5">
          <h2 id="daily" className="font-medium">
            Visits and sales per day
          </h2>
          <ul className="mt-4 flex h-44 items-end gap-1">
            {s.daily.map((d) => (
              <li
                key={d.day}
                className="flex h-full flex-1 items-end gap-px"
                title={`${d.day}: ${d.visits} visits, ${d.orders} orders, ${formatINR(d.salesPaise)} sales`}
              >
                <span className="block flex-1 rounded-t bg-paper/20" style={{ height: `${(d.visits / maxVisits) * 100}%` }} />
                <span className="block flex-1 rounded-t bg-lemon" style={{ height: `${(d.salesPaise / maxSales) * 100}%` }} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mute">
            <span className="mr-1 inline-block size-2 rounded-sm bg-paper/20" /> Visits <span className="ml-3 mr-1 inline-block size-2 rounded-sm bg-lemon" /> Sales (₹). Hover a
            day for numbers.
          </p>
        </section>
      )}

      <section aria-labelledby="sources" className="space-y-3">
        <h2 id="sources" className="text-xl font-semibold">
          Where customers came from
        </h2>
        <p className="text-sm text-mute">
          From stall QR cards (Codes &amp; QR), links with <span className="font-mono">?src=</span> or <span className="font-mono">utm_source</span>, else
          &ldquo;direct&rdquo;.
        </p>
        {s.bySource.length ? (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="text-mute">
                <tr className="border-b border-line">
                  <th className={th}>Source</th>
                  <th className={th}>Visits</th>
                  <th className={th}>Orders</th>
                  <th className={th}>Confirmed</th>
                  <th className={th}>Sales</th>
                  <th className={th}>Visit → order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.bySource.map((r) => (
                  <tr key={r.source}>
                    <td className="p-3 font-mono text-xs">{r.source}</td>
                    <td className={td}>{r.visits ?? 0}</td>
                    <td className={td}>{r.orders ?? 0}</td>
                    <td className={td}>{r.sales ?? 0}</td>
                    <td className={td}>{formatINR(r.salesPaise ?? 0)}</td>
                    <td className={td}>{pct(r.orders ?? 0, r.visits ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-mute">No visits yet for this period.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="codes" className="space-y-3">
          <h2 id="codes" className="text-xl font-semibold">
            Codes
          </h2>
          {s.byCoupon.length ? (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead className="text-mute">
                  <tr className="border-b border-line">
                    <th className={th}>Code</th>
                    <th className={th}>Orders</th>
                    <th className={th}>Sales</th>
                    <th className={th}>Given away</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.byCoupon.map((c) => (
                    <tr key={c.code}>
                      <td className="p-3 font-mono text-xs">{c.code}</td>
                      <td className={td}>
                        {c.orders}
                        <span className="text-mute"> ({c.sales} confirmed)</span>
                      </td>
                      <td className={td}>{formatINR(c.salesPaise)}</td>
                      <td className={td}>{formatINR(c.discountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-mute">
              No orders with a code yet. <Link href="/admin/coupons" className="text-lemon underline underline-offset-2">Make a code</Link>.
            </p>
          )}
        </section>

        <section aria-labelledby="types" className="space-y-3">
          <h2 id="types" className="text-xl font-semibold">
            Sales by product type
          </h2>
          {s.byType.length ? (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead className="text-mute">
                  <tr className="border-b border-line">
                    <th className={th}>Type</th>
                    <th className={th}>Units</th>
                    <th className={th}>Before discounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.byType.map((t) => (
                    <tr key={t.type}>
                      <td className="p-3">{typeLabel(t.type)}</td>
                      <td className={td}>{t.qty}</td>
                      <td className={td}>{formatINR(t.paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-mute">No confirmed orders yet for this period.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: "Most viewed", rows: s.topViewed.map((t) => ({ id: t.productId, n: `${t.count} views` })) },
          { title: "Most ordered", rows: s.topOrdered.map((t) => ({ id: t.productId, n: `${t.qty} ordered` })) },
          { title: "Low stock", rows: low.map((p) => ({ id: p.id, n: p.stock === 0 ? "Sold out" : `${p.stock} left` })) },
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
              <p className="mt-3 text-sm text-mute">{block.title === "Low stock" ? "Nothing running low." : "Nothing yet for this period."}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
