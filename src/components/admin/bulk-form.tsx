"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { bulkCreateAction, uploadProductImageAction, type FormState } from "@/app/admin/actions";
import { PRODUCT_TYPES, type Collection, type ProductType } from "@/lib/types";

type Item = { key: string; name: string; image: string };

const nameFromFile = (f: string) =>
  f
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Drop a folder of sticker designs, get one product per design. */
export function BulkForm({ collections }: { collections: Collection[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(bulkCreateAction, {});
  const [type, setType] = useState<ProductType>("sticker");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [price, setPrice] = useState("10");
  const [status, setStatus] = useState("live");
  const [namePrefix, setNamePrefix] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).slice(0, 100 - items.length);
    for (const [i, file] of list.entries()) {
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImageAction(fd);
      if (res.url) setItems((xs) => [...xs, { key: `${file.name}-${Date.now()}-${i}`, name: nameFromFile(file.name), image: res.url! }]);
      else setError(`${file.name}: ${res.error ?? "upload failed"}`);
    }
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const payload = JSON.stringify({ type, collectionId, price, status, namePrefix, items: items.map(({ name, image }) => ({ name, image })) });
  const lbl = "mb-1.5 block text-sm text-paper/70";

  if (state.ok) {
    return (
      <div className="space-y-4 rounded-2xl border border-line p-6">
        <p className="text-lg text-lemon">{state.message}</p>
        <div className="flex gap-3">
          <Link href="/admin/products" className="btn btn-primary">
            See products
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-ghost">
            Add another batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />
      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className={lbl}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as ProductType)} className="field !py-2.5">
            {PRODUCT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Collection</span>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="field !py-2.5">
            <option value="">None</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Price ₹ each (blank = ask)</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="field !py-2.5" />
        </label>
        <label className="block">
          <span className={lbl}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field !py-2.5">
            <option value="live">Live</option>
            <option value="upcoming">Coming soon</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Name prefix (optional)</span>
          <input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} className="field !py-2.5" placeholder="Anime" maxLength={60} />
        </label>
        <p className="text-xs text-mute sm:col-span-2 lg:col-span-5">Each product gets the standard options for its type (stickers: paper vinyl / waterproof). Fine-tune any of them afterwards.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <label className="btn btn-ghost cursor-pointer">
          {progress || "Choose design files"}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={Boolean(progress)} />
        </label>
        <p className="text-xs text-mute">Pick up to 100 files at once. File names become product names; edit them below.</p>
        {error && <p className="text-sm text-[#ff7a59]">{error}</p>}
        {items.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((it) => (
              <li key={it.key} className="space-y-2 rounded-xl bg-ink/40 p-2">
                <div className="grid aspect-square place-items-center">
                  <img src={it.image} alt="" className="max-h-full w-auto object-contain" />
                </div>
                <input value={it.name} onChange={(e) => setItems((xs) => xs.map((x) => (x.key === it.key ? { ...x, name: e.target.value } : x)))} className="field !py-1.5 text-sm" aria-label="Product name" />
                <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} className="text-xs text-mute hover:text-[#ff7a59]">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={pending || Boolean(progress) || items.length === 0}>
        {pending ? "Creating…" : `Create ${items.length} product${items.length === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
