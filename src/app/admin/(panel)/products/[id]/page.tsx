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
  const product = await getStore().getProduct((await params).id);
  if (!product) notFound();
  const justCreated = (await searchParams).saved === "1";

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">{product.name}</h1>
        <Link href={`/shop/${product.slug}`} className="text-sm text-mute hover:text-lemon" target="_blank">
          View in shop ↗
        </Link>
      </div>
      {justCreated && <p className="rounded-xl bg-lemon/10 px-4 py-3 text-sm">Product created.</p>}
      <ProductForm product={product} />
      <form action={deleteProductAction} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={product.id} />
        <p className="text-sm text-mute">
          Deleting removes it from the shop. Past orders keep their copy. To pause it instead, untick &ldquo;Live in shop&rdquo;.
        </p>
        <ConfirmSubmit message={`Delete ${product.name}? This can't be undone.`} className="btn btn-ghost mt-3 !py-2.5 hover:!text-[#ff7a59]">
          Delete product
        </ConfirmSubmit>
      </form>
    </div>
  );
}
