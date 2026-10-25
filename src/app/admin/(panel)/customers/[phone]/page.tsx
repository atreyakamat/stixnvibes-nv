import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, OrdersTable } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { customersFromOrders, customerTag } from "@/lib/customers";
import { formatINR } from "@/lib/money";
import { formatPhone, normalizePhone, telNumber } from "@/lib/phone";
import { getStore } from "@/lib/store";
import { addressText } from "@/lib/instagram";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[phone]">) {
  await requireAdmin();
  const phone = normalizePhone((await params).phone);
  if (!phone) notFound();
  const orders = (await getStore().listOrders({ search: phone, limit: 500 })).filter((o) => o.customerPhone === phone);
  const [c] = customersFromOrders(orders);
  if (!c) notFound();

  const facts = [
    { label: "Orders", value: `${c.orders} (${customerTag(c)})` },
    { label: "Spent", value: formatINR(c.spentPaise) },
    { label: "Average order", value: formatINR(Math.round(c.spentPaise / Math.max(1, c.orders))) },
    { label: "Customer since", value: formatDate(c.firstAt) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="text-sm text-mute hover:text-lemon">
        ← Customers
      </Link>
      <div>
        <h1 className="display text-5xl">{c.name || "No name"}</h1>
        <p className="mt-2 flex flex-wrap gap-4 text-sm">
          <a href={`tel:+${telNumber(phone)}`} className="tabular-nums text-paper/70 hover:text-lemon">
            {formatPhone(phone)}
          </a>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl border border-line p-4">
            <dt className="text-sm text-mute">{f.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
      {c.address && (
        <p className="rounded-2xl border border-line p-4 text-sm">
          <span className="text-mute">Latest address: </span>
          {addressText(c.address)}
        </p>
      )}
      <h2 className="text-xl font-semibold">Orders</h2>
      <OrdersTable orders={orders} />
    </div>
  );
}
