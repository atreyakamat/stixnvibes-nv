import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-mute hover:text-lemon">
        ← Products
      </Link>
      <h1 className="display text-5xl">Add product</h1>
      <ProductForm />
    </div>
  );
}
