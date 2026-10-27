import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Blog" };

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function BlogAdminPage() {
  await requireAdmin();
  const posts = await getStore().listPosts({ includeDrafts: true });
  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="display text-5xl">Blog</h1>
          <p className="text-paper/70">Stall stories, how-tos and new drops. Published posts show at /blog and help people find the shop on Google.</p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary">
          New post
        </Link>
      </div>
      {posts.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-paper/5">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper/5">{p.cover && <img src={p.cover} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block text-sm text-mute">
                    {p.status === "published" ? `Published ${p.publishedAt ? day.format(new Date(p.publishedAt)) : ""}` : "Draft"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-mute">No posts yet.</p>
      )}
    </div>
  );
}
