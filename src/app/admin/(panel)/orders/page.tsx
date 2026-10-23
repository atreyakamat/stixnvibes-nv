import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { STATUS_LABEL } from "@/lib/orders/status";
import { getStore } from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const search = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const orders = await getStore().listOrders({ status, search });

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active ? "bg-lemon text-ink" : "ring-1 ring-paper/20 hover:ring-lemon"}`;

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Orders</h1>
      <form className="flex max-w-md gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">
          Search orders
        </label>
        <input id="q" name="q" defaultValue={search} placeholder="Order number, name or phone" className="field !py-2.5" />
        <button type="submit" className="btn btn-ghost !py-2.5">
          Search
        </button>
      </form>
      <nav aria-label="Filter by status" className="flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin/orders" className={chip(!status)}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={chip(status === s)}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>
      <OrdersTable orders={orders} />
    </div>
  );
}
