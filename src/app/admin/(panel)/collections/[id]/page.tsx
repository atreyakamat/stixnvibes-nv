import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCollectionAction } from "@/app/admin/actions";
import { CollectionForm } from "@/components/admin/collection-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Edit collection" };

export default async function EditCollectionPage({ params, searchParams }: PageProps<"/admin/collections/[id]">) {
  await requireAdmin();
  const store = getStore();
  const [collection, products] = await Promise.all([store.getCollection((await params).id), store.listProducts({ includeHidden: true })]);
  if (!collection) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/collections" className="text-sm text-mute hover:text-lemon">
        ← Collections
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">{collection.name}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/admin/products/bulk`} className="text-mute hover:text-lemon">
            Bulk add designs
          </Link>
          <Link href={`/collections/${collection.slug}`} target="_blank" className="text-mute hover:text-lemon">
            View in shop ↗
          </Link>
        </div>
      </div>
      {(await searchParams).saved === "1" && <p className="rounded-xl bg-lemon/10 px-4 py-3 text-sm">Collection created.</p>}
      <CollectionForm collection={collection} products={products} />
      <form action={deleteCollectionAction} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={collection.id} />
        <p className="text-sm text-mute">Deleting the collection keeps its products; they just leave the collection.</p>
        <ConfirmSubmit message={`Delete the ${collection.name} collection?`} className="btn btn-ghost mt-3 !py-2.5 hover:!text-[#ff7a59]">
          Delete collection
        </ConfirmSubmit>
      </form>
    </div>
  );
}
