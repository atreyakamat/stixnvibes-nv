import type { Metadata } from "next";
import Link from "next/link";
import { BulkForm } from "@/components/admin/bulk-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Import products" };

export default async function BulkPage({ searchParams }: PageProps<"/admin/products/bulk">) {
  await requireAdmin();
  const [collections, sp] = await Promise.all([getStore().listCollections({ includeHidden: true }), searchParams]);
  const wanted = typeof sp.collection === "string" ? sp.collection : "";
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <h1 className="display text-5xl">Import products</h1>
      <p className="max-w-2xl text-paper/70">
        Bring in a whole collection at once: drop the designs (or a folder), add a CSV if you have names, prices and descriptions, pick the paper types, and check everything before it&apos;s created.
      </p>
      <BulkForm collections={collections} initialCollectionId={collections.some((c) => c.id === wanted) ? wanted : ""} />
    </div>
  );
}
