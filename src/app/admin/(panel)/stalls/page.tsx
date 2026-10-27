import type { Metadata } from "next";
import Link from "next/link";
import { StallForm } from "@/components/admin/stall-form";
import { requireAdmin } from "@/lib/admin/session";
import { istToday, stallReport } from "@/lib/costs";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Stalls" };

const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function StallsPage() {
  await requireAdmin();
  const store = getStore();
  const [stalls, sales, products, colleges, settings] = await Promise.all([
    store.listStalls(),
    store.listStallSales(),
    store.listProducts({ includeHidden: true }),
    store.listColleges({ includeHidden: true }),
    store.getSettings(),
  ]);
  const today = istToday();
  const reports = stalls.map((s) => stallReport(s, sales, products, settings.unitCosts));
  const upcoming = reports.filter((r) => r.stall.date > today).reverse();
  const past = reports.filter((r) => r.stall.date <= today);
  const totals = past.reduce((t, r) => ({ revenue: t.revenue + r.revenuePaise, profit: t.profit + r.profitPaise }), { revenue: 0, profit: 0 });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="display text-5xl">Stalls</h1>
          <p className="text-paper/70">
            Add each pop-up with its fee. Sell with stall mode on your phone, and every stall shows what it made after stock and fees.
          </p>
        </div>
        <Link href="/admin/stall" className="btn btn-primary">
          Open stall mode
        </Link>
      </div>

      {past.length > 0 && (
        <p className="text-sm text-mute">
          {past.length} stall{past.length === 1 ? "" : "s"} so far: {formatINR(totals.revenue)} in sales, <span className="text-paper">{formatINR(totals.profit)} profit</span>.
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-lemon/40 p-5">
        <h2 className="font-medium">New stall</h2>
        <StallForm colleges={colleges} today={today} />
      </section>

      {[
        { title: "Coming up", list: upcoming },
        { title: "Done", list: past },
      ].map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title} className="space-y-3">
              <h2 className="label text-mute">{g.title}</h2>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {g.list.map((r) => (
                  <li key={r.stall.id}>
                    <Link href={`/admin/stalls/${r.stall.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-4 hover:bg-paper/5">
                      <span className="w-28 shrink-0 text-sm text-mute">{day.format(new Date(r.stall.date))}</span>
                      <span className="min-w-0 flex-1 font-medium">
                        {r.stall.name}
                        {r.stall.venue && <span className="block text-sm font-normal text-mute">{r.stall.venue}</span>}
                      </span>
                      {r.sales > 0 ? (
                        <span className="text-right text-sm tabular-nums">
                          {formatINR(r.revenuePaise)} sales
                          <span className={`block ${r.profitPaise >= 0 ? "text-lemon" : "text-[#ff7a59]"}`}>{formatINR(r.profitPaise)} profit</span>
                        </span>
                      ) : (
                        <span className="text-sm text-mute">Fee {formatINR(r.stall.feePaise)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
