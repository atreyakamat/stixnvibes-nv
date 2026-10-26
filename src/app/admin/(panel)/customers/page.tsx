import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { type CustomerSort, customersFromOrders, customerTag, sortCustomers } from "@/lib/customers";
import { formatINR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Customers" };

const SORTS: { id: CustomerSort; label: string }[] = [
  { id: "recent", label: "Latest order" },
  { id: "spent", label: "Top spenders" },
  { id: "orders", label: "Most orders" },
];

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const sp = await searchParams;
  const sort = SORTS.find((s) => s.id === sp.sort)?.id ?? "recent";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const all = customersFromOrders(await getStore().listOrders({ limit: 5000 }));
  const digits = q.replace(/\D/g, "");
  const list = sortCustomers(all, sort).filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
  const repeat = all.filter((c) => c.orders > 1).length;
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-lemon text-ink" : "ring-1 ring-paper/20 hover:text-lemon"}`;

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Customers</h1>
      <p className="max-w-2xl text-sm text-mute">
        Everyone who ordered online, grouped by phone number. {all.length} customers, {repeat} came back for more. Invoices, GST and the full CRM live in InWoice.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <Link key={s.id} href={`/admin/customers?sort=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={chip(sort === s.id)}>
            {s.label}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="sort" value={sort} />
          <input name="q" defaultValue={q} placeholder="Search name or phone" className="field !py-2 text-sm" aria-label="Search customers" />
        </form>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-paper/70">{all.length ? "No one matches that search." : "No customers yet. They appear here after their first order."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-mute">
              <tr>
                <th className="px-4 py-3 font-normal">Customer</th>
                <th className="px-4 py-3 font-normal">City</th>
                <th className="px-4 py-3 text-right font-normal">Orders</th>
                <th className="px-4 py-3 text-right font-normal">Spent</th>
                <th className="px-4 py-3 text-right font-normal">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((c) => (
                <tr key={c.phone} className="hover:bg-paper/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.phone}`} className="font-medium text-lemon hover:underline">
                      {c.name || "No name"}
                    </Link>
                    <span className="block text-xs tabular-nums text-mute">{formatPhone(c.phone)}</span>
                  </td>
                  <td className="px-4 py-3 text-paper/70">{c.address?.city || (c.pickups ? "Stall pickup" : "")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.orders} <span className="ml-1 rounded-full bg-paper/5 px-2 py-0.5 text-xs text-mute">{customerTag(c)}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(c.spentPaise)}</td>
                  <td className="px-4 py-3 text-right text-paper/70">{formatDate(c.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
