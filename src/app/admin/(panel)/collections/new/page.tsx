import type { Metadata } from "next";
import Link from "next/link";
import { CollectionForm } from "@/components/admin/collection-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "New collection" };

export default async function NewCollectionPage() {
  await requireAdmin();
  const products = await getStore().listProducts({ includeHidden: true });
  return (
    <div className="space-y-6">
      <Link href="/admin/collections" className="text-sm text-mute hover:text-lemon">
        ← Collections
      </Link>
      <h1 className="display text-5xl">New collection</h1>
      <CollectionForm products={products} />
    </div>
  );
}
