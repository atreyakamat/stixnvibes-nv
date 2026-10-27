import type { Metadata } from "next";
import { deleteGalleryItemAction } from "@/app/admin/content-actions";
import { AddPhotosForm, GalleryItemForm } from "@/components/admin/gallery-forms";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Library" };

export default async function GalleryAdminPage({ searchParams }: PageProps<"/admin/gallery">) {
  await requireAdmin();
  const sp = await searchParams;
  const store = getStore();
  const [items, stalls, colleges] = await Promise.all([store.listGallery({ includeHidden: true }), store.listStalls(), store.listColleges({ includeHidden: true })]);
  const stallOpts = stalls.map((s) => ({ id: s.id, name: `${s.name} (${s.date})`, collegeId: s.collegeId }));
  const collegeOpts = colleges.map((c) => ({ id: c.id, name: c.name }));
  const stallParam = typeof sp.stall === "string" && stalls.some((s) => s.id === sp.stall) ? sp.stall : undefined;
  const collegeParam = typeof sp.college === "string" && colleges.some((c) => c.id === sp.college) ? sp.college : undefined;

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="display text-5xl">Library</h1>
        <p className="text-paper/70">
          Photos of your stalls, custom orders and everything you&apos;ve made. They show at /gallery, on college pages and on stall pages. Tag a photo with a stall
          and it lands on that college&apos;s page too.
        </p>
      </div>

      <section className="max-w-3xl space-y-3 rounded-2xl border border-lemon/40 p-5">
        <h2 className="font-medium">Add photos</h2>
        <AddPhotosForm stalls={stallOpts} colleges={collegeOpts} stallId={stallParam} collegeId={collegeParam} />
      </section>

      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((g) => (
            <li key={g.id} className={`space-y-3 rounded-2xl border border-line p-3 ${g.visible ? "" : "opacity-60"}`}>
              <img src={g.image} alt={g.caption} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
              <GalleryItemForm item={g} stalls={stallOpts} colleges={collegeOpts} />
              <form action={deleteGalleryItemAction}>
                <input type="hidden" name="id" value={g.id} />
                <ConfirmSubmit message="Remove this photo from the library?" className="text-xs text-mute hover:text-[#ff7a59]">
                  Remove
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
