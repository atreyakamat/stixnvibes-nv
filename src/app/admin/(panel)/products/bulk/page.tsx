import type { Metadata } from "next";
import Link from "next/link";
import { BulkForm } from "@/components/admin/bulk-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Bulk add" };

export default async function BulkPage() {
  await requireAdmin();
  const collections = await getStore().listCollections({ includeHidden: true });
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <h1 className="display text-5xl">Bulk add</h1>
      <p className="max-w-2xl text-paper/70">Upload a whole collection at once: one product per design, same type, price and collection.</p>
      <BulkForm collections={collections} />
    </div>
  );
}
