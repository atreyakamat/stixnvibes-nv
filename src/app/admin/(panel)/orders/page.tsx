import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/admin/orders-table";
import { STATUS_LABEL } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === sp.status) as OrderStatus | undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const orders = await getStore().listOrders({ status, search: q });
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-lemon text-ink" : "ring-1 ring-paper/20 hover:text-lemon"}`;

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Orders</h1>
      <p className="max-w-2xl text-sm text-mute">
        Every tap on &ldquo;Order on WhatsApp&rdquo; lands here with its ref (SNV-…). Match it to the WhatsApp chat, then move it along as you confirm, get paid and ship.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className={chip(!status)}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={chip(status === s)}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search ref or name" className="field !py-2 text-sm" aria-label="Search orders" />
        </form>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
