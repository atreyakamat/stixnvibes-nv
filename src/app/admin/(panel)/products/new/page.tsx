import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";
import { PRODUCT_TYPES, type ProductType } from "@/lib/types";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const store = getStore();
  const [collections, source] = await Promise.all([store.listCollections({ includeHidden: true }), typeof sp.from === "string" ? store.getProduct(sp.from) : null]);
  const type = PRODUCT_TYPES.find((t) => t.id === sp.type)?.id as ProductType | undefined;
  // Duplicating: same everything, fresh name and link, not featured.
  const copy = source ? { ...source, id: "", name: `${source.name} copy`, slug: "", featured: false } : undefined;

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <h1 className="display text-5xl">{copy ? "Duplicate product" : "Add product"}</h1>
      {!copy && (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Start from a type">
          {PRODUCT_TYPES.map((t) => (
            <Link key={t.id} href={`/admin/products/new?type=${t.id}`} className={`rounded-full px-3 py-1.5 ${t.id === (type ?? "sticker") ? "bg-lemon text-ink" : "ring-1 ring-paper/20 hover:text-lemon"}`}>
              {t.one}
            </Link>
          ))}
        </nav>
      )}
      <ProductForm key={type ?? sp.from?.toString() ?? "new"} product={copy} collections={collections} initialType={type} />
    </div>
  );
}
