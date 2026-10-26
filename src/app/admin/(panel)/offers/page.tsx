import type { Metadata } from "next";
import Link from "next/link";
import { deleteOfferAction } from "@/app/admin/actions";
import { OfferForm } from "@/components/admin/offer-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { CAMPAIGNS, nextWindow } from "@/content/campaigns";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";
import type { Offer } from "@/lib/types";

export const metadata: Metadata = { title: "Offers" };

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function runState(o: Offer, now: number): { label: string; tone: string } {
  if (!o.active) return { label: "Off", tone: "bg-paper/5 text-mute" };
  if (o.endsAt && Date.parse(o.endsAt) <= now) return { label: "Ended", tone: "bg-paper/5 text-mute" };
  if (o.startsAt && Date.parse(o.startsAt) > now) return { label: `Starts ${day.format(new Date(o.startsAt))}`, tone: "bg-[#7cc4ff]/20 text-[#bfe3ff]" };
  return { label: o.endsAt ? `Running till ${day.format(new Date(o.endsAt))}` : "Running", tone: "bg-lemon text-ink" };
}

export default async function OffersPage({ searchParams }: PageProps<"/admin/offers">) {
  await requireAdmin();
  const sp = await searchParams;
  const offers = await getStore().listOffers({ includeInactive: true });
  const now = new Date().getTime();
  const campaigns = CAMPAIGNS.map((c) => ({ c, w: nextWindow(c) })).filter((x) => x.w !== null).sort((a, b) => a.w!.startsAt.localeCompare(b.w!.startsAt));
  const picked = campaigns.find((x) => x.c.id === sp.preset);
  const preset: Partial<Offer> | undefined = picked
    ? {
        kind: "percent",
        name: picked.c.name,
        description: "",
        productType: picked.c.productType,
        percent: picked.c.percent,
        banner: picked.c.banner,
        startsAt: picked.w!.startsAt,
        endsAt: picked.w!.endsAt,
        active: true,
        sortOrder: 10,
      }
    : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="display text-5xl">Offers</h1>
      <p className="text-paper/70">
        <strong>Bulk price</strong>: once the cart holds that many of a type, each one costs the bulk price. Add one per tier (6+ at ₹25, 11+ at ₹20); the cheapest tier reached
        applies. <strong>Buy X, get Y free</strong>: items of that type are grouped from most to least expensive and the cheapest in each full group are free.{" "}
        <strong>% off</strong>: a sale on what&apos;s left after those two. Any offer can have start and end dates; it switches itself on and off.
      </p>

      <section className="space-y-3" aria-labelledby="campaigns">
        <h2 id="campaigns" className="text-xl font-semibold">
          Campaign templates
        </h2>
        <p className="text-sm text-mute">Pick one to fill in a sale with its name, banner and dates, then tweak and save. Festival dates that move each year are the usual ones; check them.</p>
        <ul className="flex flex-wrap gap-2">
          {campaigns.map(({ c, w }) => (
            <li key={c.id}>
              <Link
                href={`/admin/offers?preset=${c.id}#new-offer`}
                className={`inline-flex flex-col rounded-2xl px-3.5 py-2 text-sm ring-1 transition-colors ${picked?.c.id === c.id ? "bg-lemon text-ink ring-lemon" : "ring-paper/20 hover:ring-lemon"}`}
              >
                <span className="font-medium">{c.name}</span>
                <span className={picked?.c.id === c.id ? "text-ink/70" : "text-mute"}>{day.format(new Date(`${w!.day}T00:00:00+05:30`))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ul className="space-y-4">
        {offers.map((o) => {
          const st = runState(o, now);
          return (
            <li key={o.id} className="space-y-3 rounded-2xl border border-line p-5">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${st.tone}`}>{st.label}</span>
              <OfferForm offer={o} />
              <form action={deleteOfferAction}>
                <input type="hidden" name="id" value={o.id} />
                <ConfirmSubmit message={`Delete "${o.name}"?`} className="text-sm text-mute hover:text-[#ff7a59]">
                  Delete offer
                </ConfirmSubmit>
              </form>
            </li>
          );
        })}
      </ul>
      <section id="new-offer" className="scroll-mt-6 space-y-3 rounded-2xl border border-dashed border-line p-5">
        <h2 className="font-medium">{picked ? `New offer from "${picked.c.name}"` : "New offer"}</h2>
        <OfferForm key={picked?.c.id ?? "blank"} preset={preset} />
      </section>
    </div>
  );
}
