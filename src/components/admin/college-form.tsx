"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { saveCollegeAction } from "@/app/admin/content-actions";
import type { College, Coupon, Product } from "@/lib/types";
import { ImagesEditor } from "./images-editor";
import { slugify } from "./product-form";

export function CollegeForm({ college, products, coupons }: { college?: College; products: Pick<Product, "id" | "name" | "images">[]; coupons: Pick<Coupon, "code" | "description">[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCollegeAction, {});
  const [name, setName] = useState(college?.name ?? "");
  const [slug, setSlug] = useState(college?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(college));
  const [area, setArea] = useState(college?.area ?? "");
  const [description, setDescription] = useState(college?.description ?? "");
  const [image, setImage] = useState(college?.image ?? "");
  const [couponCode, setCouponCode] = useState(college?.couponCode ?? "");
  const [picked, setPicked] = useState<string[]>(college?.productIds ?? []);
  const [active, setActive] = useState(college?.active ?? true);
  const [sortOrder, setSortOrder] = useState(String(college?.sortOrder ?? 0));
  const [filter, setFilter] = useState("");
  const payload = JSON.stringify({ name, slug, area, description, image, couponCode, productIds: picked, active, sortOrder });
  const shown = products.filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
  const lbl = "mb-1.5 block text-sm text-paper/70";

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <input type="hidden" name="payload" value={payload} />
      {college && <input type="hidden" name="id" value={college.id} />}
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-line p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={lbl}>College name</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value.replace(/^st\.?\s+/i, "")).split("-").slice(0, 2).join("-"));
                }}
                className="field"
                required
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className={lbl}>Link name</span>
              <span className="flex items-center gap-1 text-sm text-mute">
                /c/
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
              </span>
            </label>
          </div>
          <label className="block">
            <span className={lbl}>Area</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} className="field" placeholder="Mapusa" />
          </label>
          <label className="block">
            <span className={lbl}>A line or two for students from this college</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="field min-h-20" />
          </label>
          <div>
            <span className={lbl}>Cover photo (optional)</span>
            <ImagesEditor images={image ? [image] : []} onChange={(imgs) => setImage(imgs[imgs.length - 1] ?? "")} max={1} />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">
              Picks for this college <span className="text-mute">({picked.length})</span>
            </h2>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter" className="field !w-48 !py-2 text-sm" aria-label="Filter products" />
          </div>
          <p className="text-xs text-mute">Shown first. Best sellers from your stalls at this college show automatically after them.</p>
          <ul className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
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
        <label className="block">
          <span className={lbl}>Code shown on the page</span>
          <select value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="field !py-2.5">
            <option value="">None</option>
            {coupons.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
                {c.description && ` · ${c.description}`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-lemon" />
          Page is live
        </label>
        <label className="block">
          <span className={lbl}>Sort order (lower shows first)</span>
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className="field !py-2.5" />
        </label>
        <p role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </p>
        <button type="submit" className="btn btn-primary w-full justify-center disabled:opacity-50" disabled={pending}>
          {pending ? "Saving…" : college ? "Save changes" : "Create page"}
        </button>
        {college && (
          <a href={`/c/${college.slug}`} target="_blank" rel="noopener" className="block text-sm text-lemon underline underline-offset-2">
            View the page ↗
          </a>
        )}
      </aside>
    </form>
  );
}
