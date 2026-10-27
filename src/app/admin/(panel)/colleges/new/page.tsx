import type { Metadata } from "next";
import Link from "next/link";
import { CollegeForm } from "@/components/admin/college-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "New college" };

export default async function NewCollegePage() {
  await requireAdmin();
  const store = getStore();
  const [products, coupons] = await Promise.all([store.listProducts({ includeHidden: true }), store.listCoupons()]);
  return (
    <div className="space-y-6">
      <Link href="/admin/colleges" className="text-sm text-mute hover:text-lemon">
        ← Colleges
      </Link>
      <h1 className="display text-5xl">New college</h1>
      <CollegeForm products={products} coupons={coupons} />
    </div>
  );
}
