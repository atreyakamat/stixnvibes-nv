"use client";

import { useActionState, useState } from "react";
import { saveProductAction, type FormState } from "@/app/admin/actions";
import { formatINR, paiseToRupees } from "@/lib/money";
import { TEMPLATES } from "@/lib/store/seed";
import { CUSTOM_FIELD_KINDS, PRODUCT_STATUSES, PRODUCT_TYPES, type Collection, type CustomFieldKind, type Product, type ProductType } from "@/lib/types";
import { ImagesEditor } from "./images-editor";

type ValueRow = { id: string; label: string; delta: string };
type GroupRow = { id: string; name: string; values: ValueRow[] };
type FieldRow = { id: string; label: string; kind: CustomFieldKind; required: boolean; help: string };

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const rid = () => Math.random().toString(36).slice(2, 10);
const deltaText = (p: number) => (p === 0 ? "" : p < 0 ? `-${paiseToRupees(-p)}` : paiseToRupees(p));

const KIND_LABEL: Record<CustomFieldKind, string> = { text: "Short text", textarea: "Long text", link: "Link", image: "Photo upload" };
const STATUS_LABEL = { live: "Live (can be ordered)", upcoming: "Coming soon (shown, can't be ordered)", hidden: "Hidden (admin only)" };

function groupsFrom(p: Pick<Product, "options">): GroupRow[] {
  return p.options.map((g) => ({ id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, delta: deltaText(v.priceDeltaPaise) })) }));
}

export function ProductForm({ product, collections, initialType }: { product?: Product; collections: Collection[]; initialType?: ProductType }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProductAction, {});
  const startType = product?.type ?? initialType ?? "sticker";
  const tpl = TEMPLATES[startType];
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug || slugify(product?.name ?? ""));
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [type, setType] = useState<ProductType>(startType);
  const [collectionIds, setCollectionIds] = useState<string[]>(product?.collectionIds ?? []);
  const [description, setDescription] = useState(product?.description ?? "");
  const [details, setDetails] = useState(product?.details ?? tpl.details);
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [status, setStatus] = useState(product?.status ?? "live");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [soldOut, setSoldOut] = useState(product?.soldOut ?? false);
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [price, setPrice] = useState(paiseToRupees(product?.pricePaise ?? (startType === "sticker" && !product ? 1000 : null)));
  const [compareAt, setCompareAt] = useState(paiseToRupees(product?.compareAtPaise ?? null));
  const [minQty, setMinQty] = useState(String(product?.minQty ?? 1));
  const [groups, setGroups] = useState<GroupRow[]>(groupsFrom(product ?? tpl));
  const [fields, setFields] = useState<FieldRow[]>(product?.customFields ?? tpl.customFields);

  const payload = JSON.stringify({
    name,
    slug,
    type,
    collectionIds,
    description,
    details,
    tags,
    images,
    status,
    featured,
    soldOut,
    badge,
    sortOrder,
    price,
    compareAt,
    minQty,
    options: groups.map((g) => ({ id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, delta: v.delta })) })),
    customFields: fields,
  });

  const applyTemplate = (t: ProductType) => {
    const x = TEMPLATES[t];
    setGroups(groupsFrom(x));
    setFields(structuredClone(x.customFields));
    setDetails(x.details);
  };

  const setGroup = (gid: string, patch: Partial<GroupRow>) => setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  const setValue = (gid: string, vid: string, patch: Partial<ValueRow>) =>
    setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, values: g.values.map((v) => (v.id === vid ? { ...v, ...patch } : v)) } : g)));
  const setField = (fid: string, patch: Partial<FieldRow>) => setFields((fs) => fs.map((f) => (f.id === fid ? { ...f, ...patch } : f)));

  // Live preview of every price combination, so mistakes are easy to spot.
  const base = Number(price || "NaN");
  const combos = groups.reduce<{ label: string; delta: number }[]>(
    (acc, g) => acc.flatMap((a) => g.values.map((v) => ({ label: [a.label, v.label].filter(Boolean).join(" · "), delta: a.delta + (Number(v.delta || 0) || 0) }))),
    [{ label: "", delta: 0 }],
  );

  const lbl = "mb-1.5 block text-sm text-paper/70";
  const section = "space-y-4 rounded-2xl border border-line p-5";
  const small = "field !py-2 text-sm";

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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={lbl}>Product type</span>
              <select value={type} onChange={(e) => setType(e.target.value as ProductType)} className="field">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.one}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-ghost !py-2.5 text-sm"
                onClick={() => {
                  if (groups.length + fields.length === 0 || window.confirm("Replace the options, custom fields and details with the template?")) applyTemplate(type);
                }}
              >
                Use {PRODUCT_TYPES.find((t) => t.id === type)?.one.toLowerCase()} template
              </button>
            </div>
          </div>
          <label className="block">
            <span className={lbl}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="field min-h-24" maxLength={3000} placeholder="What it is, why it's cool." />
          </label>
          <label className="block">
            <span className={lbl}>Details: material, size, care</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="field min-h-24" maxLength={3000} />
          </label>
          <label className="block">
            <span className={lbl}>Tags, comma separated (help search)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="field" placeholder="lo-fi, anime, cars" />
          </label>
        </section>

        <section className={section}>
          <h2 className="font-medium">Price</h2>
          <p className="text-xs text-mute">Bulk prices (e.g. 6+ at ₹25) and buy-X-get-Y deals are set per product type under Offers.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={lbl}>Price ₹ (blank = ask on WhatsApp)</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="field tabular-nums" placeholder="10" />
            </label>
            <label className="block">
              <span className={lbl}>Was ₹ (optional, shown crossed out)</span>
              <input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} inputMode="decimal" className="field tabular-nums" />
            </label>
            <label className="block">
              <span className={lbl}>Minimum per order</span>
              <input value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="numeric" className="field tabular-nums" />
            </label>
          </div>
        </section>

        <section className={section}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-medium">Options</h2>
            <p className="text-xs text-mute">Customers pick one choice per option. The first choice is the default. Price change adds to the base price.</p>
          </div>
          {groups.map((g) => (
            <fieldset key={g.id} className="space-y-3 rounded-xl bg-ink/40 p-3">
              <legend className="sr-only">Option {g.name}</legend>
              <div className="flex gap-2">
                <input value={g.name} onChange={(e) => setGroup(g.id, { name: e.target.value })} className={`${small} font-medium`} placeholder="Option name, e.g. Size" aria-label="Option name" />
                <button type="button" onClick={() => setGroups((gs) => gs.filter((x) => x.id !== g.id))} className="shrink-0 px-2 text-sm text-mute hover:text-[#ff7a59]">
                  Remove option
                </button>
              </div>
              {g.values.map((v, i) => (
                <div key={v.id} className="grid grid-cols-[1fr_7rem_auto_auto] items-center gap-2">
                  <input value={v.label} onChange={(e) => setValue(g.id, v.id, { label: e.target.value })} className={small} placeholder="Choice, e.g. A3" aria-label="Choice" />
                  <input value={v.delta} onChange={(e) => setValue(g.id, v.id, { delta: e.target.value })} className={`${small} tabular-nums`} placeholder="+₹0" aria-label="Price change in rupees" inputMode="decimal" />
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => setGroup(g.id, { values: [v, ...g.values.filter((x) => x.id !== v.id)] })}
                    className="text-xs text-mute hover:text-lemon disabled:opacity-30"
                    title="Make default"
                  >
                    {i === 0 ? "Default" : "Set default"}
                  </button>
                  <button type="button" onClick={() => setGroup(g.id, { values: g.values.filter((x) => x.id !== v.id) })} disabled={g.values.length === 1} className="px-1 text-mute hover:text-[#ff7a59] disabled:opacity-30" aria-label="Remove choice">
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setGroup(g.id, { values: [...g.values, { id: rid(), label: "", delta: "" }] })} className="text-sm text-lemon hover:underline">
                + Add choice
              </button>
            </fieldset>
          ))}
          <button type="button" className="btn btn-ghost !py-2.5" onClick={() => setGroups((gs) => [...gs, { id: rid(), name: "", values: [{ id: rid(), label: "", delta: "" }] }])}>
            Add option
          </button>
          {groups.length > 0 && !Number.isNaN(base) && combos.length <= 24 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-mute hover:text-paper">Price check: {combos.length} combinations</summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {combos.map((c) => (
                  <li key={c.label} className="flex justify-between gap-3 rounded-lg bg-ink/40 px-3 py-1.5">
                    <span className="text-paper/70">{c.label}</span>
                    <span className="tabular-nums">{formatINR(Math.max(0, Math.round((base + c.delta) * 100)))}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className={section}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-medium">Customer fills in</h2>
            <p className="text-xs text-mute">e.g. a Spotify link, a name for the dedication, or a photo.</p>
          </div>
          {fields.map((f) => (
            <div key={f.id} className="grid gap-2 rounded-xl bg-ink/40 p-3 sm:grid-cols-[1fr_9rem_auto_auto] sm:items-center">
              <input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} className={small} placeholder="Label, e.g. Spotify song link" aria-label="Field label" />
              <select value={f.kind} onChange={(e) => setField(f.id, { kind: e.target.value as CustomFieldKind })} className={small} aria-label="Field type">
                {CUSTOM_FIELD_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.required} onChange={(e) => setField(f.id, { required: e.target.checked })} className="size-4 accent-lemon" />
                Required
              </label>
              <button type="button" onClick={() => setFields((fs) => fs.filter((x) => x.id !== f.id))} className="text-sm text-mute hover:text-[#ff7a59]">
                Remove
              </button>
              <input value={f.help} onChange={(e) => setField(f.id, { help: e.target.value })} className={`${small} sm:col-span-4`} placeholder="Hint shown under the field (optional)" aria-label="Hint" />
            </div>
          ))}
          <button type="button" className="btn btn-ghost !py-2.5" onClick={() => setFields((fs) => [...fs, { id: rid(), label: "", kind: "text", required: false, help: "" }])}>
            Add field
          </button>
        </section>

        <section className={section}>
          <h2 className="font-medium">Photos</h2>
          <ImagesEditor images={images} onChange={setImages} />
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line p-5 xl:sticky xl:top-6">
        <label className="block">
          <span className={lbl}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as Product["status"])} className="field !py-2.5">
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-lemon" />
          Featured on home page
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="size-4 accent-lemon" />
          Sold out
        </label>
        <label className="block">
          <span className={lbl}>Badge (optional)</span>
          <input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} className="field !py-2.5" placeholder="New, Bestseller, Gift" />
        </label>
        {collections.length > 0 && (
          <fieldset>
            <legend className={lbl}>Collections</legend>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={collectionIds.includes(c.id)}
                    onChange={(e) => setCollectionIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))}
                    className="size-4 accent-lemon"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
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
          {pending ? "Saving…" : product?.id ? "Save changes" : "Create product"}
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
