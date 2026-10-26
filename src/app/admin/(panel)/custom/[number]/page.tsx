import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomRequestForm } from "@/components/admin/custom-request-form";
import { formatDate } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/admin/session";
import { dmLink } from "@/lib/instagram";
import { kindLabel } from "@/lib/custom-kinds";
import { formatPhone, telNumber } from "@/lib/phone";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Custom request" };

export default async function CustomRequestPage({ params }: PageProps<"/admin/custom/[number]">) {
  await requireAdmin();
  const r = await getStore().getCustomRequest((await params).number.toUpperCase());
  if (!r) notFound();
  const facts: [string, string][] = [
    ["What", kindLabel(r.kind)],
    ["Quantity", String(r.qty)],
    ["Size / cut", r.size || "Not given"],
    ["Came from", r.source || "Direct"],
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/custom" className="text-sm text-mute hover:text-lemon">
        ← Custom requests
      </Link>
      <div>
        <h1 className="display font-mono text-5xl">{r.number}</h1>
        <p className="mt-2 text-sm text-mute">Sent {formatDate(r.createdAt)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <dl className="grid gap-4 rounded-2xl border border-line p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-mute">Customer</dt>
              <dd className="mt-1">
                {r.customerName}
                <span className="mt-1 flex flex-wrap gap-3">
                  <a href={`tel:+${telNumber(r.customerPhone)}`} className="tabular-nums text-paper/70 hover:text-lemon">
                    {formatPhone(r.customerPhone)}
                  </a>
                  <a href={`https://wa.me/${telNumber(r.customerPhone)}`} target="_blank" rel="noopener" className="text-lemon underline underline-offset-2">
                    WhatsApp
                  </a>
                  {r.instagram && (
                    <a href={dmLink(r.instagram)} target="_blank" rel="noopener" className="text-lemon underline underline-offset-2">
                      @{r.instagram}
                    </a>
                  )}
                </span>
              </dd>
            </div>
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-mute">{k}</dt>
                <dd className="mt-1">{v}</dd>
              </div>
            ))}
            {r.note && (
              <div className="sm:col-span-2">
                <dt className="text-mute">Note</dt>
                <dd className="mt-1 whitespace-pre-line">{r.note}</dd>
              </div>
            )}
          </dl>

          <section className="space-y-3">
            <h2 className="font-medium">Designs ({r.files.length})</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {r.files.map((id, i) => (
                <li key={id} className="space-y-2">
                  <a href={`/u/${id}`} target="_blank" rel="noopener" className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-paper/5 p-2">
                    <img src={`/u/${id}`} alt={`Design ${i + 1}`} className="max-h-full w-auto object-contain" />
                  </a>
                  <a href={`/u/${id}`} download className="text-xs text-mute hover:text-lemon">
                    Open design {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="space-y-3">
          <CustomRequestForm request={r} />
          <Link href={`/admin/sheets?custom=${r.number}`} className="btn btn-ghost w-full justify-center !py-2.5">
            Make a Cricut sheet from these designs
          </Link>
        </div>
      </div>
    </div>
  );
}
