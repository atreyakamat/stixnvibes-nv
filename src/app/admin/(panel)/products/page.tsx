import type { Metadata } from "next";
import Link from "next/link";
import { quickProductAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { fromPrice, hasPriceRange } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import { PRODUCT_STATUSES, PRODUCT_TYPES, typeLabel } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

const STATUS = { live: "Live", upcoming: "Coming soon", hidden: "Hidden" } as const;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const [type, status, collection, q] = [str("type"), str("status"), str("collection"), str("q").toLowerCase()];
  const store = getStore();
  const [all, collections] = await Promise.all([store.listProducts({ includeHidden: true }), store.listCollections({ includeHidden: true })]);
  const products = all.filter(
    (p) =>
      (!type || p.type === type) &&
      (!status || p.status === status) &&
      (!collection || p.collectionIds.includes(collection)) &&
      (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/bulk" className="btn btn-ghost">
            Bulk add
          </Link>
          <Link href="/admin/products/new" className="btn btn-primary">
            Add product
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 text-sm">
        <select name="type" defaultValue={type} className="field !w-auto !py-2">
          <option value="">All types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="field !w-auto !py-2">
          <option value="">Any status</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS[s]}
            </option>
          ))}
        </select>
        <select name="collection" defaultValue={collection} className="field !w-auto !py-2">
          <option value="">Any collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Search" className="field !w-48 !py-2" />
        <button className="btn btn-ghost !py-2">Filter</button>
      </form>

      <p className="text-sm text-mute">
        {products.length} of {all.length} products
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Product</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Price</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Quick</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const price = fromPrice(p);
              return (
                <tr key={p.id} className="hover:bg-paper/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-lemon">
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-ink p-1">{p.images[0] && <img src={p.images[0]} alt="" loading="lazy" className="max-h-full w-auto object-contain" />}</span>
                      <span>
                        {p.name}
                        {p.featured && <span className="label ml-2 text-lemon">Featured</span>}
                        <span className="block text-xs text-mute">
                          {p.options.map((g) => `${g.name} (${g.values.length})`).join(" · ") || "No options"}
                          {p.customFields.length > 0 && ` · ${p.customFields.length} custom field${p.customFields.length === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-paper/70">{typeLabel(p.type)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {price === null ? <span className="text-[#ffb020]">No price</span> : `${hasPriceRange(p) ? "From " : ""}${formatINR(price)}`}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS[p.status]}
                    {p.soldOut && <span className="ml-1 text-[#ffb020]">· Sold out</span>}
                  </td>
                  <td className="px-4 py-3">
                    <form action={quickProductAction} className="flex flex-wrap gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <button name="op" value={p.status === "live" ? "hidden" : "live"} className="rounded-full px-2.5 py-1 text-xs ring-1 ring-paper/20 hover:text-lemon">
                        {p.status === "live" ? "Hide" : "Go live"}
                      </button>
                      <button name="op" value="soldOut" className="rounded-full px-2.5 py-1 text-xs ring-1 ring-paper/20 hover:text-lemon">
                        {p.soldOut ? "In stock" : "Sold out"}
                      </button>
                      <button name="op" value="featured" className="rounded-full px-2.5 py-1 text-xs ring-1 ring-paper/20 hover:text-lemon">
                        {p.featured ? "Unfeature" : "Feature"}
                      </button>
                      <Link href={`/admin/products/new?from=${p.id}`} className="rounded-full px-2.5 py-1 text-xs ring-1 ring-paper/20 hover:text-lemon">
                        Duplicate
                      </Link>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
