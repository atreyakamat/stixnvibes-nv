"use client";

import { useActionState, useRef, useState } from "react";
import { saveProductAction, uploadProductImageAction, type FormState } from "@/app/admin/actions";
import { paiseToRupees } from "@/lib/money";
import { CATEGORIES, type Product } from "@/lib/types";

type VariantRow = { key: string; id?: string; label: string; price: string; stock: string; active: boolean };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProductAction, {});
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [category, setCategory] = useState<string>(product?.category ?? "stickers");
  const [description, setDescription] = useState(product?.description ?? "");
  const [details, setDetails] = useState(product?.details ?? "");
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      key: newKey(),
      id: v.id,
      label: v.label,
      price: paiseToRupees(v.pricePaise),
      stock: v.stock === null ? "" : String(v.stock),
      active: v.active,
    })) ?? [{ key: newKey(), label: "Standard", price: "", stock: "", active: true }],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imagePath, setImagePath] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const payload = JSON.stringify({
    name,
    slug,
    category,
    description,
    details,
    tags,
    images,
    active,
    featured,
    sortOrder,
    variants: variants.map(({ id, label, price, stock, active }) => ({ ...(id ? { id } : {}), label, price, stock, active })),
  });

  const updateVariant = (key: string, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImageAction(fd);
      if (res.url) setImages((imgs) => [...imgs, res.url!]);
      else setUploadError(res.error ?? "Upload failed.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((imgs) => {
      const next = [...imgs];
      const j = i + d;
      if (j < 0 || j >= next.length) return imgs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const lbl = "mb-1.5 block text-sm text-paper/70";
  const section = "space-y-4 rounded-2xl border border-line p-5";

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <input type="hidden" name="payload" value={payload} />
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-6">
        <section className={section}>
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
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className={lbl}>Link name</span>
              <div className="flex items-center gap-1 text-sm text-mute">
                <span className="hidden sm:inline">/shop/</span>
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
              </div>
            </label>
          </div>
          <label className="block">
            <span className={lbl}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Short description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="field min-h-20" maxLength={2000} />
          </label>
          <label className="block">
            <span className={lbl}>Details: material, size, care</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="field min-h-24" maxLength={2000} />
          </label>
          <label className="block">
            <span className={lbl}>Tags, comma separated (help search)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="field" placeholder="lo-fi, anime, cars" />
          </label>
        </section>

        <section className={section}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Options and prices</h2>
            <p className="text-xs text-mute">Blank price = not for sale yet. Blank stock = made to order.</p>
          </div>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <fieldset key={v.key} className="grid gap-3 rounded-xl bg-ink/40 p-3 sm:grid-cols-[1fr_7rem_7rem_auto_auto] sm:items-end">
                <legend className="sr-only">Option {i + 1}</legend>
                <label className="block">
                  <span className={lbl}>Option name</span>
                  <input value={v.label} onChange={(e) => updateVariant(v.key, { label: e.target.value })} className="field !py-2.5" placeholder='e.g. 3" or A4' required />
                </label>
                <label className="block">
                  <span className={lbl}>Price ₹</span>
                  <input value={v.price} onChange={(e) => updateVariant(v.key, { price: e.target.value })} inputMode="decimal" className="field !py-2.5 tabular-nums" />
                </label>
                <label className="block">
                  <span className={lbl}>Stock</span>
                  <input value={v.stock} onChange={(e) => updateVariant(v.key, { stock: e.target.value })} inputMode="numeric" className="field !py-2.5 tabular-nums" />
                </label>
                <label className="flex items-center gap-2 pb-3 text-sm">
                  <input type="checkbox" checked={v.active} onChange={(e) => updateVariant(v.key, { active: e.target.checked })} className="size-4 accent-lemon" />
                  On sale
                </label>
                <button
                  type="button"
                  onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}
                  disabled={variants.length === 1}
                  className="pb-3 text-sm text-mute hover:text-[#ff7a59] disabled:opacity-30"
                >
                  Remove
                </button>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost !py-2.5"
            onClick={() => setVariants((vs) => [...vs, { key: newKey(), label: "", price: "", stock: "", active: true }])}
          >
            Add option
          </button>
        </section>

        <section className={section}>
          <h2 className="font-medium">Photos</h2>
          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((src, i) => (
                <li key={`${src.slice(0, 80)}-${i}`} className="space-y-2 rounded-xl bg-ink/40 p-2">
                  <div className="grid aspect-square place-items-center">
                    <img src={src} alt="" className="max-h-full w-auto object-contain" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30" aria-label="Move earlier">
                      ←
                    </button>
                    <button type="button" onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} className="text-mute hover:text-[#ff7a59]">
                      Remove
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="disabled:opacity-30" aria-label="Move later">
                      →
                    </button>
                  </div>
                  {i === 0 && <p className="label text-center text-lemon">Main</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn btn-ghost cursor-pointer !py-2.5">
              {uploading ? "Uploading…" : "Upload photos"}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading || images.length >= 8} />
            </label>
            <span className="text-xs text-mute">PNG, JPG or WebP, up to 5 MB, max 8 photos. Square, transparent PNG/WebP look best.</span>
          </div>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Or add an image path</span>
              <input value={imagePath} onChange={(e) => setImagePath(e.target.value)} placeholder="Or paste an image link, e.g. /lofi/lofi-03.webp" className="field !py-2.5 text-sm" />
            </label>
            <button
              type="button"
              className="btn btn-ghost !py-2.5"
              onClick={() => {
                const p = imagePath.trim();
                if (p && (p.startsWith("/") || p.startsWith("https://"))) {
                  setImages((imgs) => [...imgs, p]);
                  setImagePath("");
                }
              }}
            >
              Add
            </button>
          </div>
          {uploadError && <p className="text-sm text-[#ff7a59]">{uploadError}</p>}
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line p-5 xl:sticky xl:top-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-lemon" />
          Live in shop
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-lemon" />
          Featured on home page
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
        <button type="submit" className="btn btn-primary w-full justify-center disabled:opacity-50" disabled={pending || uploading}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </aside>
    </form>
  );
}

export function ConfirmSubmit({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
