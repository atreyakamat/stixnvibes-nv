"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { bulkCreateAction, uploadProductImageAction, type FormState } from "@/app/admin/actions";
import { paiseToRupees } from "@/lib/money";
import {
  CSV_TEMPLATE,
  DEFAULT_PRICE,
  fileKey,
  isImageLink,
  nameFromFile,
  PAPER_PRESETS,
  readCsv,
  splitList,
  starterDescription,
  type CsvRow,
} from "@/lib/product-import";
import { TEMPLATES } from "@/lib/store/seed";
import { PRODUCT_TYPES, type Collection, type ProductType } from "@/lib/types";

type Item = {
  key: string;
  /** File name key the CSV matches on ("" when the row had no file). */
  file: string;
  name: string;
  image: string;
  description: string;
  price: string;
  compareAt: string;
  tags: string;
  stock: string;
  badge: string;
  /** Labels of the papers this one comes in; null = every paper in the import. */
  papers: string[] | null;
};

type Paper = { key: string; label: string; note: string; on: boolean; delta: string; custom: boolean };

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 100;
const NEW = "__new__";
const rid = () => Math.random().toString(36).slice(2, 10);

function papersFor(type: ProductType): Paper[] {
  return PAPER_PRESETS.map((p) => ({ key: p.id, label: p.label, note: p.note, on: p.types.includes(type), delta: "", custom: false }));
}

function keepFor(type: ProductType): Record<string, string[]> {
  const pg = type === "poster" ? "print" : "material";
  return Object.fromEntries(TEMPLATES[type].options.filter((g) => g.id !== pg).map((g) => [g.id, g.values.map((v) => v.id)]));
}

const blankItem = (over: Partial<Item>): Item => ({
  key: rid(),
  file: "",
  name: "",
  image: "",
  description: "",
  price: "",
  compareAt: "",
  tags: "",
  stock: "",
  badge: "",
  papers: null,
  ...over,
});

/** Fold a CSV row into an item (row values win where filled). */
function applyRow(it: Item, row: CsvRow): Item {
  return {
    ...it,
    name: row.name ?? it.name,
    description: row.description ?? it.description,
    price: row.price ?? it.price,
    compareAt: row.compare_at ?? it.compareAt,
    tags: row.tags ?? it.tags,
    stock: row.stock ?? it.stock,
    badge: row.badge ?? it.badge,
    papers: row.paper ? splitList(row.paper) : it.papers,
  };
}

/**
 * Import products: drop designs (files or a whole folder), optionally a CSV
 * with names, prices and descriptions, pick the papers, and get one product
 * per design.
 */
export function BulkForm({ collections, initialCollectionId }: { collections: Collection[]; initialCollectionId?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(bulkCreateAction, {});
  const [type, setType] = useState<ProductType>("sticker");
  const [collectionId, setCollectionId] = useState(initialCollectionId ?? "");
  const [newCollection, setNewCollection] = useState("");
  const [price, setPrice] = useState(DEFAULT_PRICE.sticker);
  const [status, setStatus] = useState("hidden");
  const [namePrefix, setNamePrefix] = useState("");
  const [papers, setPapers] = useState<Paper[]>(papersFor("sticker"));
  const [ownPaper, setOwnPaper] = useState("");
  const [keep, setKeep] = useState<Record<string, string[]>>(keepFor("sticker"));
  const [details, setDetails] = useState(TEMPLATES.sticker.details);
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const onPapers = papers.filter((p) => p.on && p.label.trim());
  const otherGroups = TEMPLATES[type].options.filter((g) => g.id in keep);

  function changeType(t: ProductType) {
    setType(t);
    setPrice(DEFAULT_PRICE[t]);
    // Keep any custom papers, ticked or not; reset presets to the type's usual ones.
    setPapers((ps) => [...papersFor(t), ...ps.filter((p) => p.custom)]);
    setKeep(keepFor(t));
    setDetails(TEMPLATES[t].details);
  }

  function addPaper(label: string, on = true) {
    const l = label.trim().slice(0, 40);
    if (!l) return;
    setPapers((ps) => (ps.some((p) => p.label.toLowerCase() === l.toLowerCase()) ? ps.map((p) => (p.label.toLowerCase() === l.toLowerCase() ? { ...p, on: p.on || on } : p)) : [...ps, { key: rid(), label: l, note: "Your own", on, delta: "", custom: true }]));
  }

  async function addFiles(list: File[]) {
    setErrors([]);
    const csv = list.find((f) => /\.csv$/i.test(f.name) || f.type === "text/csv");
    if (csv) await addCsv(csv);
    const images = list.filter((f) => IMAGE_TYPES.includes(f.type)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const skipped = list.filter((f) => f !== csv && !IMAGE_TYPES.includes(f.type) && !f.name.startsWith("."));
    const errs: string[] = skipped.length ? [`Skipped ${skipped.length} file${skipped.length === 1 ? "" : "s"} that aren't PNG, JPG or WebP.`] : [];
    const room = MAX - items.filter((i) => i.image).length;
    if (images.length > room) errs.push(`Only ${room} more fit in one import (${MAX} max). The rest were left out.`);
    for (const [i, file] of images.slice(0, Math.max(0, room)).entries()) {
      setProgress(`Uploading ${i + 1} of ${Math.min(images.length, room)}…`);
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImageAction(fd);
      if (!res.url) {
        errs.push(`${file.name}: ${res.error ?? "upload failed"}`);
        continue;
      }
      const k = fileKey(file.name);
      setItems((xs) => {
        // A CSV row waiting for this file gets the photo.
        const waiting = xs.find((x) => x.file === k && !x.image);
        if (waiting) return xs.map((x) => (x === waiting ? { ...x, image: res.url! } : x));
        return [...xs, blankItem({ file: k, name: nameFromFile(file.name), image: res.url! })];
      });
    }
    setProgress("");
    setErrors(errs);
    for (const r of [fileRef, folderRef]) if (r.current) r.current.value = "";
  }

  async function addCsv(file: File) {
    const { rows, unknown, error } = readCsv(await file.text());
    if (csvRef.current) csvRef.current.value = "";
    if (error) return setErrors([error]);
    const msgs: string[] = [];
    if (unknown.length) msgs.push(`Ignored column${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);
    // Papers named in the CSV that aren't in the list yet get added (₹0 extra).
    const named = new Set(rows.flatMap((r) => splitList(r.paper)));
    const fresh = [...named].filter((l) => !papers.some((p) => p.label.toLowerCase() === l.toLowerCase()));
    for (const l of named) addPaper(l);
    if (fresh.length) msgs.push(`Added paper${fresh.length === 1 ? "" : "s"} from the CSV: ${fresh.join(", ")}. Set their prices below.`);
    let waiting = 0;
    let out = [...items];
    for (const row of rows) {
      const f = row.file ?? "";
      if (f && isImageLink(f)) {
        out.push(applyRow(blankItem({ name: row.name ?? nameFromFile(f), image: f }), row));
        continue;
      }
      const k = f ? fileKey(f) : "";
      const hit = out.find((x) => (k ? x.file === k : x.name.toLowerCase() === (row.name ?? "").toLowerCase()));
      if (hit) out = out.map((x) => (x === hit ? applyRow(x, row) : x));
      else {
        out.push(applyRow(blankItem({ file: k, name: row.name ?? (f ? nameFromFile(f) : "") }), row));
        waiting++;
      }
    }
    if (out.length > MAX) msgs.push(`Only the first ${MAX} products fit in one import.`);
    setItems(out.slice(0, MAX));
    msgs.unshift(`Read ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}.`);
    if (waiting) msgs.push(`${waiting} row${waiting === 1 ? " is" : "s are"} waiting for a photo. Add the matching files and they'll slot in.`);
    setNotes(msgs);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "stix-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function fillDescriptions() {
    setItems((xs) => xs.map((x) => (x.description.trim() ? x : { ...x, description: starterDescription(x.name, type, (x.papers ?? onPapers.map((p) => p.label)).filter((l) => onPapers.some((p) => p.label === l))) })));
  }

  const edit = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function togglePaper(it: Item, label: string) {
    const all = onPapers.map((p) => p.label);
    const cur = it.papers ?? all;
    const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
    edit(it.key, { papers: next.length === all.length && all.every((l) => next.includes(l)) ? null : next });
  }

  const noPhoto = items.filter((i) => !i.image).length;
  const payload = useMemo(
    () =>
      JSON.stringify({
        type,
        collectionId: collectionId === NEW ? "" : collectionId,
        newCollection: collectionId === NEW ? newCollection.trim() : undefined,
        price,
        status,
        namePrefix,
        papers: onPapers.map((p) => ({ label: p.label.trim(), delta: p.delta })),
        keep,
        details,
        items: items.map((i) => ({
          name: i.name,
          image: i.image,
          description: i.description || undefined,
          price: i.price.trim() || undefined,
          compareAt: i.compareAt.trim() || undefined,
          tags: i.tags || undefined,
          stock: i.stock.trim() || undefined,
          badge: i.badge || undefined,
          papers: i.papers ? i.papers.filter((l) => onPapers.some((p) => p.label === l)) : undefined,
        })),
      }),
    [type, collectionId, newCollection, price, status, namePrefix, onPapers, keep, details, items],
  );
  const lbl = "mb-1.5 block text-sm text-paper/70";

  if (state.ok) {
    return (
      <div className="space-y-4 rounded-2xl border border-line p-6">
        <p className="text-lg text-lemon">{state.message}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/products" className="btn btn-primary">
            See products
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-ghost">
            Import another batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <h2 className="text-lg font-semibold">1. The basics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className={lbl}>Type</span>
            <select value={type} onChange={(e) => changeType(e.target.value as ProductType)} className="field !py-2.5" name="import-type">
              {PRODUCT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Collection</span>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="field !py-2.5" name="import-collection">
              <option value="">None</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW}>+ New collection…</option>
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Price ₹ each (blank = ask)</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="field !py-2.5" name="import-price" />
          </label>
          <label className="block">
            <span className={lbl}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="field !py-2.5" name="import-status">
              <option value="hidden">Hidden (check first)</option>
              <option value="upcoming">Coming soon</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Name prefix (optional)</span>
            <input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} className="field !py-2.5" placeholder="Anime" maxLength={60} />
          </label>
          {collectionId === NEW && (
            <label className="block sm:col-span-2">
              <span className={lbl}>New collection name</span>
              <input value={newCollection} onChange={(e) => setNewCollection(e.target.value)} className="field !py-2.5" placeholder="Goa Christmas" maxLength={80} name="import-new-collection" />
            </label>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <div>
          <h2 className="text-lg font-semibold">2. Paper types</h2>
          <p className="text-sm text-mute">Tick what customers can pick. The first ticked one is the default. ₹ extra goes on top of the price.</p>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {papers.map((p) => (
            <li key={p.key} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${p.on ? "border-lemon/60 bg-lemon/5" : "border-line"}`}>
              <input type="checkbox" checked={p.on} onChange={(e) => setPapers((ps) => ps.map((x) => (x.key === p.key ? { ...x, on: e.target.checked } : x)))} aria-label={`Offer ${p.label}`} className="size-4 accent-[var(--color-lemon,#f5e663)]" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.label}</span>
                <span className="block truncate text-xs text-mute">{p.note}</span>
              </span>
              <label className="flex shrink-0 items-center gap-1 text-sm text-mute">
                +₹
                <input value={p.delta} onChange={(e) => setPapers((ps) => ps.map((x) => (x.key === p.key ? { ...x, delta: e.target.value } : x)))} inputMode="decimal" placeholder="0" className="field !w-16 !py-1.5 text-sm" aria-label={`${p.label} extra price`} disabled={!p.on} />
              </label>
              {p.custom && (
                <button type="button" onClick={() => setPapers((ps) => ps.filter((x) => x.key !== p.key))} className="text-xs text-mute hover:text-[#ff7a59]" aria-label={`Remove ${p.label}`}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input value={ownPaper} onChange={(e) => setOwnPaper(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPaper(ownPaper); setOwnPaper(""); } }} className="field !w-60 !py-2" placeholder="Add your own, e.g. Holographic" maxLength={40} />
          <button type="button" className="btn btn-ghost" onClick={() => { addPaper(ownPaper); setOwnPaper(""); }}>
            Add paper
          </button>
        </div>
        {onPapers.length === 0 && <p className="text-xs text-mute">No paper ticked: products won&apos;t show a paper choice.</p>}

        {otherGroups.map((g) => (
          <div key={g.id} className="space-y-2">
            <p className="text-sm text-paper/70">{g.name}s to offer</p>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const on = keep[g.id]?.includes(v.id);
                return (
                  <label key={v.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${on ? "border-lemon bg-lemon/10 text-lemon" : "border-line text-mute"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setKeep((k) => ({ ...k, [g.id]: on ? k[g.id].filter((x) => x !== v.id) : g.values.filter((x) => x.id === v.id || k[g.id].includes(x.id)).map((x) => x.id) }))} />
                    {v.label}
                    {v.priceDeltaPaise ? ` +₹${paiseToRupees(v.priceDeltaPaise)}` : ""}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <label className="block">
          <span className={lbl}>Details on every product (material, size, care)</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="field min-h-20 text-sm" maxLength={2000} />
        </label>
      </section>

      <section
        className={`space-y-4 rounded-2xl border p-5 ${dragging ? "border-lemon bg-lemon/5" : "border-line"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!progress) void addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <div>
          <h2 className="text-lg font-semibold">3. Designs</h2>
          <p className="text-sm text-mute">Drop images here, pick files or a whole folder. A CSV in the folder is read too. One design = one product; file names become names.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-primary cursor-pointer">
            {progress || "Choose images"}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,.csv,text/csv" multiple className="sr-only" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} disabled={Boolean(progress)} data-testid="import-files" />
          </label>
          <label className="btn btn-ghost cursor-pointer">
            Choose a folder
            <input ref={folderRef} type="file" multiple className="sr-only" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} disabled={Boolean(progress)} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
          </label>
          <label className="btn btn-ghost cursor-pointer">
            Add CSV
            <input ref={csvRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && addCsv(e.target.files[0])} data-testid="import-csv" />
          </label>
          <button type="button" onClick={downloadTemplate} className="btn btn-ghost">
            Download CSV template
          </button>
        </div>
        <p className="text-xs text-mute">
          CSV columns: file, name, description, price, compare_at, paper, tags, stock, badge. Leave a cell blank to use the import&apos;s setting. Several papers: <code>Paper vinyl|Waterproof</code>. A full https link in <code>file</code> works instead of uploading.
        </p>
        {notes.map((n) => (
          <p key={n} className="text-sm text-lemon">
            {n}
          </p>
        ))}
        {errors.map((e) => (
          <p key={e} className="text-sm text-[#ff7a59]">
            {e}
          </p>
        ))}

        {items.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-mute">
                {items.length} product{items.length === 1 ? "" : "s"}
                {noPhoto ? `, ${noPhoto} without a photo yet` : ""}
              </span>
              <button type="button" onClick={fillDescriptions} className="btn btn-ghost !py-1.5 text-sm">
                Fill empty descriptions
              </button>
              <button type="button" onClick={() => setItems([])} className="text-xs text-mute hover:text-[#ff7a59]">
                Clear all
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((it) => (
                <li key={it.key} className="flex gap-3 rounded-xl bg-ink/40 p-3" data-testid="import-item">
                  <div className="grid size-24 shrink-0 place-items-center rounded-lg bg-ink/60">
                    {it.image ? <img src={it.image} alt="" className="max-h-full w-auto object-contain" /> : <span className="px-1 text-center text-[11px] text-mute">Waiting for {it.file || "a photo"}</span>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input value={it.name} onChange={(e) => edit(it.key, { name: e.target.value })} className="field !py-1.5 text-sm font-medium" aria-label="Product name" maxLength={120} />
                    <textarea value={it.description} onChange={(e) => edit(it.key, { description: e.target.value })} className="field min-h-14 !py-1.5 text-xs" placeholder="Description" aria-label="Description" maxLength={4000} />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input value={it.price} onChange={(e) => edit(it.key, { price: e.target.value })} className="field !py-1 text-xs" placeholder={`₹${price || "ask"}`} aria-label="Price" inputMode="decimal" />
                      <input value={it.stock} onChange={(e) => edit(it.key, { stock: e.target.value })} className="field !py-1 text-xs" placeholder="Stock" aria-label="Stock" inputMode="numeric" />
                      <input value={it.tags} onChange={(e) => edit(it.key, { tags: e.target.value })} className="field col-span-2 !py-1 text-xs" placeholder="Tags, comma separated" aria-label="Tags" />
                    </div>
                    {onPapers.length > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {onPapers.map((p) => {
                          const on = (it.papers ?? onPapers.map((x) => x.label)).includes(p.label);
                          return (
                            <button key={p.key} type="button" onClick={() => togglePaper(it, p.label)} className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-lemon/70 text-lemon" : "border-line text-mute line-through"}`} aria-pressed={on}>
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} className="text-xs text-mute hover:text-[#ff7a59]">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {state.error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={pending || Boolean(progress) || items.length === 0 || (collectionId === NEW && !newCollection.trim())}>
          {pending ? "Creating…" : `Create ${items.length} product${items.length === 1 ? "" : "s"}`}
        </button>
        {status === "hidden" && items.length > 0 && <span className="text-xs text-mute">They&apos;ll be hidden until you make them live in Products.</span>}
      </div>
    </form>
  );
}
