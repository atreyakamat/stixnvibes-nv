import type { Metadata } from "next";
import { deleteOfferAction } from "@/app/admin/actions";
import { OfferForm } from "@/components/admin/offer-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Offers" };

export default async function OffersPage() {
  await requireAdmin();
  const offers = await getStore().listOffers({ includeInactive: true });
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="display text-5xl">Offers</h1>
      <p className="text-paper/70">
        Buy X, get Y free. In the cart, items of that type are grouped from most to least expensive and the cheapest in each full group are free. Each item counts toward
        one offer only, applied in the order shown.
      </p>
      <ul className="space-y-4">
        {offers.map((o) => (
          <li key={o.id} className="space-y-3 rounded-2xl border border-line p-5">
            <OfferForm offer={o} />
            <form action={deleteOfferAction}>
              <input type="hidden" name="id" value={o.id} />
              <ConfirmSubmit message={`Delete "${o.name}"?`} className="text-sm text-mute hover:text-[#ff7a59]">
                Delete offer
              </ConfirmSubmit>
            </form>
          </li>
        ))}
      </ul>
      <section className="space-y-3 rounded-2xl border border-dashed border-line p-5">
        <h2 className="font-medium">New offer</h2>
        <OfferForm />
      </section>
    </div>
  );
}
