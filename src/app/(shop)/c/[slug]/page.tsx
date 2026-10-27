import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoWall } from "@/components/photo-wall";
import { ProductCard } from "@/components/product/product-card";
import { topProducts } from "@/lib/costs";
import { formatStallDate, getCollegeBySlug, getCollegeSales, getGallery, getPublicStalls, upcomingStalls } from "@/lib/content";
import { formatINR } from "@/lib/money";
import { canOrder } from "@/lib/pricing";
import { getShopState } from "@/lib/shop";
import { getStoreOrNull } from "@/lib/store";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const college = await getCollegeBySlug((await params).slug);
  if (!college) return { title: "Not found" };
  return {
    title: `${college.name}`,
    description: college.description || `Stix N Vibes stickers, posters and cards picked for ${college.name}${college.area ? `, ${college.area}` : ""}.`,
    alternates: { canonical: `/c/${college.slug}` },
  };
}

export default async function CollegePage({ params }: PageProps<"/c/[slug]">) {
  const college = await getCollegeBySlug((await params).slug);
  if (!college) notFound();
  const [{ products }, sales, gallery, stalls, next] = await Promise.all([getShopState(), getCollegeSales(college.id), getGallery(), getPublicStalls(), upcomingStalls(college.id)]);
  const coupon = college.couponCode ? await getStoreOrNull()?.getCoupon(college.couponCode).catch(() => null) : null;
  const now = new Date().getTime();
  const running = coupon && coupon.active && (!coupon.endsAt || Date.parse(coupon.endsAt) > now) && (!coupon.startsAt || Date.parse(coupon.startsAt) <= now) ? coupon : null;

  // Hand-picked first, then what sold best at this college's stalls.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ids = [...college.productIds, ...topProducts(sales, 12).map((t) => t.productId)];
  const picks = [...new Set(ids)]
    .map((id) => byId.get(id))
    .filter((p) => p && canOrder(p))
    .slice(0, 8);
  const fallback = picks.length ? [] : products.filter((p) => p.featured && canOrder(p)).slice(0, 8);
  const collegeStalls = new Set(stalls.filter((s) => s.collegeId === college.id).map((s) => s.id));
  const photos = gallery.filter((g) => g.collegeId === college.id || (g.stallId && collegeStalls.has(g.stallId))).slice(0, 12);

  return (
    <>
      <section className="container-x grid items-center gap-10 pt-10 md:grid-cols-[1.2fr_1fr] md:pt-16">
        <div>
          <p className="label text-mute">{college.area ? `${college.area} · ` : ""}Stix N Vibes</p>
          <h1 className="display mt-3 text-[clamp(2.8rem,8vw,6rem)]">
            Hey, <span className="text-lemon">{college.name}</span>
          </h1>
          {college.description && <p className="mt-5 max-w-lg text-lg text-paper/75">{college.description}</p>}
          {running && (
            <p className="mt-6 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl bg-lemon px-5 py-3 text-ink" data-testid="college-code">
              <span className="font-semibold">{running.percent !== null ? `${running.percent}% off` : `${formatINR(running.amountPaise!)} off`}</span>
              <span>
                with code <span className="font-mono font-bold">{running.code}</span>
              </span>
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={running ? `/shop?code=${running.code}` : "/shop"} className="btn btn-primary">
              Shop now
            </Link>
            <Link href="/bundle" className="btn btn-ghost">
              Build a sticker pack
            </Link>
          </div>
        </div>
        {college.image && <img src={college.image} alt="" className="ice w-full rounded-[2rem] border border-line object-cover" />}
      </section>

      {next.length > 0 && (
        <section className="container-x pt-16" aria-labelledby="next">
          <h2 id="next" className="display text-[clamp(2rem,5vw,3.5rem)]">
            Find our <span className="text-lemon">stall</span>
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {next.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line p-5">
                <p className="text-lemon">{formatStallDate(s.date)}</p>
                <p className="mt-1 font-semibold">{s.name}</p>
                {s.venue && <p className="text-sm text-mute">{s.venue}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-16" aria-labelledby="picks">
        <h2 id="picks" className="display text-[clamp(2rem,5vw,3.5rem)]">
          {sales.length ? (
            <>
              What {college.name.replace(/^St\.?\s+/i, "")} <span className="text-lemon">picks</span>
            </>
          ) : (
            <>
              Our <span className="text-lemon">favourites</span>
            </>
          )}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {[...picks, ...fallback].map((p) => (
            <li key={p!.id}>
              <ProductCard product={p!} />
            </li>
          ))}
        </ul>
      </section>

      {photos.length > 0 && (
        <section className="container-x pt-16" aria-labelledby="photos">
          <div className="flex items-end justify-between gap-6">
            <h2 id="photos" className="display text-[clamp(2rem,5vw,3.5rem)]">
              At {college.name.replace(/^St\.?\s+/i, "")}
            </h2>
            <Link href={`/gallery?college=${college.slug}`} className="label text-mute hover:text-lemon">
              All photos →
            </Link>
          </div>
          <div className="mt-6">
            <PhotoWall items={photos} label={(g) => g.caption || `Stix N Vibes at ${college.name}`} />
          </div>
        </section>
      )}
    </>
  );
}
