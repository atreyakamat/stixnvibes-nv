import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { fromPrice } from "@/lib/orders/pricing";
import { getStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  await requireAdmin();
  const products = await getStore().listProducts({ includeInactive: true });
  const cat = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          Add product
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Product</th>
              <th className="px-4 py-3 font-normal">Category</th>
              <th className="px-4 py-3 font-normal">Price</th>
              <th className="px-4 py-3 font-normal">Stock</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const price = fromPrice(p);
              const tracked = p.variants.filter((v) => v.stock !== null);
              const stock = tracked.length ? tracked.reduce((n, v) => n + (v.stock ?? 0), 0) : null;
              return (
                <tr key={p.id} className="hover:bg-paper/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-lemon">
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-ink p-1">
                        {p.images[0] && <img src={p.images[0]} alt="" className="max-h-full w-auto object-contain" />}
                      </span>
                      <span>
                        {p.name}
                        {p.featured && <span className="label ml-2 text-lemon">Featured</span>}
                        <span className="block text-xs text-mute">
                          {p.variants.length} option{p.variants.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-paper/70">{cat(p.category)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {price === null ? <span className="text-[#ffb020]">No price</span> : formatINR(price)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-paper/70">{stock === null ? "Made to order" : stock}</td>
                  <td className="px-4 py-3">{p.active ? "Live" : <span className="text-mute">Hidden</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
