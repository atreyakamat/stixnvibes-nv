import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCollegeAction } from "@/app/admin/content-actions";
import { CollegeForm } from "@/components/admin/college-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "College" };

export default async function EditCollegePage({ params }: PageProps<"/admin/colleges/[id]">) {
  await requireAdmin();
  const store = getStore();
  const college = await store.getCollege((await params).id);
  if (!college) notFound();
  const [products, coupons] = await Promise.all([store.listProducts({ includeHidden: true }), store.listCoupons()]);
  return (
    <div className="space-y-6">
      <Link href="/admin/colleges" className="text-sm text-mute hover:text-lemon">
        ← Colleges
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl">{college.name}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/coupons/card?src=college-${college.slug}&path=/c/${college.slug}${college.couponCode ? `&code=${college.couponCode}` : ""}`} className="btn btn-ghost !py-2.5 text-sm">
            QR card
          </Link>
          <Link href={`/admin/gallery?college=${college.id}`} className="btn btn-ghost !py-2.5 text-sm">
            Add photos
          </Link>
        </div>
      </div>
      <CollegeForm college={college} products={products} coupons={coupons} />
      <form action={deleteCollegeAction}>
        <input type="hidden" name="id" value={college.id} />
        <ConfirmSubmit message="Delete this college page? Its stalls and photos stay, just unlinked." className="text-sm text-mute hover:text-[#ff7a59]">
          Delete college
        </ConfirmSubmit>
      </form>
    </div>
  );
}
