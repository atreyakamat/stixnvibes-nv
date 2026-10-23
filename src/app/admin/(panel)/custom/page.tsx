import type { Metadata } from "next";
import { formatDate } from "@/components/admin/orders-table";
import { CustomRequestForm } from "@/components/admin/custom-request-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Custom requests" };

export default async function CustomRequestsPage() {
  await requireAdmin();
  const store = getStore();
  const requests = await store.listCustomRequests();
  const withLinks = await Promise.all(
    requests.map(async (r) => ({ ...r, fileUrl: r.file ? await store.customFileUrl(r.file) : null })),
  );

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Custom requests</h1>
      {withLinks.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-paper/70">No custom requests yet.</p>
      ) : (
        <ul className="space-y-4">
          {withLinks.map((r) => (
            <li key={r.id} className={`rounded-2xl border p-5 ${r.status === "new" ? "border-lemon/50" : "border-line"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-medium">{r.name}</p>
                <p className="text-sm text-mute">{formatDate(r.createdAt)}</p>
              </div>
              <p className="text-sm text-paper/80">{r.contact}</p>
              <p className="mt-3 whitespace-pre-line">{r.description}</p>
              <p className="mt-2 text-sm text-paper/70">
                {r.cut} · {r.size || "size not given"} · qty {r.quantity}
              </p>
              {r.fileUrl && (
                <a href={r.fileUrl} target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-lemon underline underline-offset-4">
                  Open uploaded artwork
                </a>
              )}
              <CustomRequestForm id={r.id} status={r.status} adminNote={r.adminNote} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
