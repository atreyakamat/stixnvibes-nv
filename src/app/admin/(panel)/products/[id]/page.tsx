import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/admin/actions";
import { ConfirmSubmit, ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const store = getStore();
  const [product, collections] = await Promise.all([store.getProduct((await params).id), store.listCollections({ includeHidden: true })]);
  if (!product) notFound();
  const justCreated = (await searchParams).saved === "1";

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">{product.name}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/admin/products/new?from=${product.id}`} className="text-mute hover:text-lemon">
            Duplicate
          </Link>
          <Link href={`/shop/${product.slug}`} className="text-mute hover:text-lemon" target="_blank">
            View in shop ↗
          </Link>
        </div>
      </div>
      {justCreated && <p className="rounded-xl bg-lemon/10 px-4 py-3 text-sm">Product created.</p>}
      <ProductForm product={product} collections={collections} />
      <form action={deleteProductAction} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={product.id} />
        <p className="text-sm text-mute">Deleting removes it from the shop. Past orders keep their copy. To pause it instead, set the status to Hidden.</p>
        <ConfirmSubmit message={`Delete ${product.name}? This can't be undone.`} className="btn btn-ghost mt-3 !py-2.5 hover:!text-[#ff7a59]">
          Delete product
        </ConfirmSubmit>
      </form>
    </div>
  );
}
