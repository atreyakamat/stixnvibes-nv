"use client";

import { useActionState, useState } from "react";
import { saveCollectionAction, type FormState } from "@/app/admin/actions";
import type { Collection, Product } from "@/lib/types";
import { ImagesEditor } from "./images-editor";
import { slugify } from "./product-form";

export function CollectionForm({ collection, products }: { collection?: Collection; products: Product[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCollectionAction, {});
  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [description, setDescription] = useState(collection?.description ?? "");
  const [image, setImage] = useState(collection?.image ?? "");
  const [active, setActive] = useState(collection?.active ?? true);
  const [featured, setFeatured] = useState(collection?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(collection?.sortOrder ?? 0));
  const [picked, setPicked] = useState<string[]>(collection ? products.filter((p) => p.collectionIds.includes(collection.id)).map((p) => p.id) : []);
  const [filter, setFilter] = useState("");

  const payload = JSON.stringify({ name, slug, description, image, active, featured, sortOrder, productIds: picked });
  const shown = products.filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
  const lbl = "mb-1.5 block text-sm text-paper/70";

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <input type="hidden" name="payload" value={payload} />
      {collection && <input type="hidden" name="id" value={collection.id} />}
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-line p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={lbl}>Name</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                className="field"
                required
                maxLength={80}
              />
            </label>
            <label className="block">
              <span className={lbl}>Link name</span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className="field font-mono"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className={lbl}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="field min-h-20" />
          </label>
          <div>
            <span className={lbl}>Cover image (optional: uses the first product photo otherwise)</span>
            <ImagesEditor images={image ? [image] : []} onChange={(imgs) => setImage(imgs[imgs.length - 1] ?? "")} max={1} />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">
              Products in this collection <span className="text-mute">({picked.length})</span>
            </h2>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter" className="field !w-48 !py-2 text-sm" aria-label="Filter products" />
          </div>
          <ul className="grid max-h-[32rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((p) => {
              const on = picked.includes(p.id);
              return (
                <li key={p.id}>
                  <label className={`flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm ring-1 ${on ? "bg-lemon/10 ring-lemon" : "ring-line hover:ring-paper/30"}`}>
                    <input type="checkbox" checked={on} onChange={(e) => setPicked((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id)))} className="size-4 accent-lemon" />
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink p-1">{p.images[0] && <img src={p.images[0]} alt="" loading="lazy" className="max-h-full w-auto object-contain" />}</span>
                    <span className="truncate">{p.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line p-5 xl:sticky xl:top-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-lemon" />
          Show in shop
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-lemon" />
          Featured (shows first)
        </label>
        <label className="block">
          <span className={lbl}>Sort order (lower shows first)</span>
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className="field !py-2.5" />
        </label>
        {state.error && (
          <p className="text-sm text-[#ff7a59]" role="alert">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="text-sm text-lemon" role="status">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full justify-center disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : collection ? "Save changes" : "Create collection"}
        </button>
      </aside>
    </form>
  );
}
