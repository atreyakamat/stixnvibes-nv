import Link from "next/link";
import { formatINR } from "@/lib/money";
import type { Order } from "@/lib/types";
import { StatusBadge } from "./status-badge";

const dt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function formatDate(iso: string) {
  return dt.format(new Date(iso));
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="rounded-2xl border border-line p-6 text-paper/70">No orders yet. They show up here the moment a customer taps &ldquo;Order on WhatsApp&rdquo;.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-line text-mute">
          <tr>
            <th className="px-4 py-3 font-normal">Order</th>
            <th className="px-4 py-3 font-normal">Customer</th>
            <th className="px-4 py-3 font-normal">Items</th>
            <th className="px-4 py-3 font-normal">Status</th>
            <th className="px-4 py-3 text-right font-normal">Total</th>
            <th className="px-4 py-3 text-right font-normal">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-paper/[0.03]">
              <td className="px-4 py-3">
                <Link href={`/admin/orders/${o.number}`} className="font-mono text-lemon hover:underline">
                  {o.number}
                </Link>
              </td>
              <td className="px-4 py-3">{o.customerName || <span className="text-mute">Not given</span>}</td>
              <td className="max-w-64 truncate px-4 py-3 text-paper/70">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatINR(o.totalPaise)}</td>
              <td className="px-4 py-3 text-right text-paper/70">{formatDate(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
