import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteStallAction, voidStallSaleFormAction } from "@/app/admin/stall-actions";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { StallForm } from "@/components/admin/stall-form";
import { requireAdmin } from "@/lib/admin/session";
import { istToday, stallReport, topProducts } from "@/lib/costs";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";
import { typeLabel } from "@/lib/types";

export const metadata: Metadata = { title: "Stall" };

const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function StallPage({ params }: PageProps<"/admin/stalls/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const store = getStore();
  const stall = await store.getStall(id);
  if (!stall) notFound();
  const [sales, products, colleges, settings] = await Promise.all([
    store.listStallSales({ stallId: id }),
    store.listProducts({ includeHidden: true }),
    store.listColleges({ includeHidden: true }),
    store.getSettings(),
  ]);
  const r = stallReport(stall, sales, products, settings.unitCosts);
  const name = (pid: string) => products.find((p) => p.id === pid)?.name ?? "Deleted product";
  const top = topProducts(sales, 10);

  const rows = [
    { label: "Sales", value: r.revenuePaise, hint: `${r.sales} sale${r.sales === 1 ? "" : "s"}, ${r.units} items · cash ${formatINR(r.cashPaise)} · UPI ${formatINR(r.upiPaise)}` },
    { label: "Stock cost", value: -r.costPaise, hint: r.missing.length ? `No cost set for ${r.missing.map(typeLabel).join(", ")}: set it in Settings` : "From your unit costs" },
    { label: "Stall fee", value: -stall.feePaise, hint: "" },
    { label: "Other costs", value: -stall.otherCostsPaise, hint: "" },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <Link href="/admin/stalls" className="text-sm text-mute hover:text-lemon">
        ← Stalls
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">{stall.name}</h1>
          <p className="mt-2 text-mute">
            {stall.date}
            {stall.venue && ` · ${stall.venue}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stall.date >= istToday() && (
            <Link href="/admin/stall" className="btn btn-primary !py-2.5 text-sm">
              Stall mode
            </Link>
          )}
          <Link href={`/admin/gallery?stall=${stall.id}`} className="btn btn-ghost !py-2.5 text-sm">
            Add photos
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-line p-5" aria-label="Profit">
        <dl className="divide-y divide-line text-sm">
          {rows.map((x) => (
            <div key={x.label} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <dt>
                {x.label}
                {x.hint && <span className="block text-xs text-mute">{x.hint}</span>}
              </dt>
              <dd className="tabular-nums">{formatINR(x.value)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-3 text-lg font-semibold">
            <dt>Profit</dt>
            <dd className={`tabular-nums ${r.profitPaise >= 0 ? "text-lemon" : "text-[#ff7a59]"}`} data-testid="stall-profit">
              {formatINR(r.profitPaise)}
            </dd>
          </div>
        </dl>
      </section>

      {top.length > 0 && (
        <section className="space-y-3">
          <h2 className="label text-mute">Best sellers here</h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {top.map((t, i) => (
              <li key={t.productId} className="flex justify-between rounded-xl bg-paper/5 px-3 py-2 text-sm">
                <span>
                  {i + 1}. {name(t.productId)}
                </span>
                <span className="tabular-nums text-mute">{t.qty}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {sales.length > 0 && (
        <section className="space-y-3">
          <h2 className="label text-mute">Sales</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
            {sales.map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3">
                <span className="w-32 shrink-0 text-xs text-mute">{time.format(new Date(x.soldAt))}</span>
                <span className="min-w-0 flex-1">{x.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}</span>
                <span className="text-mute">{x.payment === "cash" ? "Cash" : "UPI"}</span>
                <span className="tabular-nums">{formatINR(x.totalPaise)}</span>
                <form action={voidStallSaleFormAction}>
                  <input type="hidden" name="id" value={x.id} />
                  <input type="hidden" name="stallId" value={stall.id} />
                  <ConfirmSubmit message="Remove this sale? Its stock goes back." className="text-xs text-mute hover:text-[#ff7a59]">
                    Remove
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-line p-5">
        <h2 className="font-medium">Edit</h2>
        <StallForm stall={stall} colleges={colleges} today={istToday()} />
        <form action={deleteStallAction} className="pt-2">
          <input type="hidden" name="id" value={stall.id} />
          <ConfirmSubmit message="Delete this stall? Its sales are kept, just not linked to a stall." className="text-xs text-mute hover:text-[#ff7a59]">
            Delete stall
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
