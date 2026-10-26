import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { kindLabel } from "@/lib/custom-kinds";
import { formatPhone } from "@/lib/phone";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Custom requests" };

const CUSTOM_STATUS_LABEL = { new: "New", quoted: "Quoted", won: "Ordered", lost: "Didn't go ahead" } as const;

export default async function CustomRequestsPage() {
  await requireAdmin();
  const requests = await getStore().listCustomRequests();
  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Custom requests</h1>
      <p className="max-w-2xl text-sm text-mute">
        Customers send their own designs from the shop&apos;s Custom page. Each one is emailed to you with the designs attached (once email is set up) and lands here. Quote
        them on Instagram or WhatsApp, then mark how it went.
      </p>
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-paper/70">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="text-left text-mute">
              <tr className="border-b border-line">
                <th className="p-3 font-normal">Ref</th>
                <th className="p-3 font-normal">When</th>
                <th className="p-3 font-normal">Customer</th>
                <th className="p-3 font-normal">What</th>
                <th className="p-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">
                    <Link href={`/admin/custom/${r.number}`} className="font-mono text-lemon hover:underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap p-3 text-mute">{formatDate(r.createdAt)}</td>
                  <td className="p-3">
                    {r.customerName}
                    <span className="block text-xs text-mute">{r.instagram ? `@${r.instagram}` : formatPhone(r.customerPhone)}</span>
                  </td>
                  <td className="p-3">
                    {r.qty} × {kindLabel(r.kind)}
                    {r.size && <span className="block text-xs text-mute">{r.size}</span>}
                  </td>
                  <td className="p-3">{CUSTOM_STATUS_LABEL[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
