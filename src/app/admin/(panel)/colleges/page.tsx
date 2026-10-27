import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Colleges" };

export default async function CollegesAdminPage() {
  await requireAdmin();
  const store = getStore();
  const [colleges, stalls] = await Promise.all([store.listColleges({ includeHidden: true }), store.listStalls()]);
  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="display text-5xl">Colleges</h1>
          <p className="text-paper/70">
            A page per college at /c/name with its code, your picks, best sellers from stalls there, upcoming stalls and photos. Point that college&apos;s stall QR
            card at it.
          </p>
        </div>
        <Link href="/admin/colleges/new" className="btn btn-primary">
          New college
        </Link>
      </div>
      {colleges.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {colleges.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/colleges/${c.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-4 hover:bg-paper/5">
                <span className="min-w-0 flex-1 font-medium">
                  {c.name}
                  <span className="block font-mono text-sm font-normal text-mute">/c/{c.slug}</span>
                </span>
                <span className="text-sm text-mute">
                  {stalls.filter((s) => s.collegeId === c.id).length} stalls{!c.active && " · hidden"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-mute">No colleges yet.</p>
      )}
    </div>
  );
}
