import Link from "next/link";
import { CollectionCard } from "@/components/collection-card";
import { OfferStrip } from "@/components/offer-strip";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/reveal";
import { StallReels } from "@/components/stall-reels";
import { collectionCover, getShopState } from "@/lib/shop";
import { PRODUCT_TYPES } from "@/lib/types";
import { dmLink } from "@/lib/instagram";

export const revalidate = 60;

const HERO_STICKERS = [
  { src: "/lofi/lofi-07.webp", className: "left-[4%] top-[8%] w-[30%] -rotate-12" },
  { src: "/lofi/lofi-12.webp", className: "right-[6%] top-[2%] w-[28%] rotate-6" },
  { src: "/lofi/lofi-02.webp", className: "left-[22%] bottom-[4%] w-[32%] rotate-3" },
  { src: "/lofi/lofi-14.webp", className: "right-[10%] bottom-[10%] w-[26%] -rotate-6" },
];

export default async function HomePage() {
  const { products, collections, offers, settings } = await getShopState();
  const live = products.filter((p) => p.status === "live");
  const featured = live.filter((p) => p.featured).slice(0, 8);
  const shown = featured.length ? featured : live.slice(0, 8);
  const upcoming = products.filter((p) => p.status === "upcoming").slice(0, 4);
  const types = PRODUCT_TYPES.map((t) => ({ ...t, cover: products.find((p) => p.type === t.id && p.images[0])?.images[0] ?? null })).filter((t) =>
    products.some((p) => p.type === t.id),
  );

  return (
    <>
      <section className="container-x grid items-center gap-10 pb-12 pt-8 md:grid-cols-2 md:pb-20 md:pt-14">
        <div>
          <p className="label fade-up text-mute">The Stix N Vibes shop</p>
          <h1 className="display mt-5 text-[clamp(3.4rem,10vw,8.5rem)]">
            <span className="rise-line">
              <span style={{ ["--d" as string]: "80ms" }}>Your stickers.</span>
            </span>
            <span className="rise-line">
              <span style={{ ["--d" as string]: "180ms" }} className="text-lemon">
                Your vibe.
              </span>
            </span>
          </h1>
          <p className="fade-up mt-6 max-w-md text-lg text-paper/75" style={{ ["--d" as string]: "300ms" }}>
            Stickers from ₹10, posters, Spotify music cards and wall cards. Fill your cart and order in a few taps, then send it to us on Instagram.
          </p>
          <OfferStrip offers={offers} className="fade-up mt-6" />
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: "400ms" }}>
            <Link href="/shop" className="btn btn-primary">
              Shop now
            </Link>
            <Link href="/collections" className="btn btn-ghost">
              Collections
            </Link>
          </div>
        </div>
        <div className="relative aspect-square w-full" aria-hidden="true">
          <div className="ice absolute inset-[6%] rounded-[2rem] border border-line" />
          {HERO_STICKERS.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt=""
              className={`drop-in sticker-shadow absolute h-auto ${s.className}`}
              style={{ ["--d" as string]: `${300 + i * 120}ms` }}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
        </div>
      </section>

      {types.length > 0 && (
        <section className="container-x" aria-labelledby="types">
          <h2 id="types" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
            What we <span className="text-lemon">make</span>
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {types.map((t) => (
              <li key={t.id}>
                <Link href={`/shop?type=${t.id}`} className="ice group flex h-full flex-col rounded-[1.5rem] border border-line p-4 transition-colors hover:border-lemon/60">
                  <div className="grid aspect-square place-items-center rounded-2xl bg-ink/60 p-4">
                    {t.cover && <img src={t.cover} alt="" loading="lazy" className="sticker-shadow max-h-full w-auto object-contain transition-transform duration-500 group-hover:-rotate-3" />}
                  </div>
                  <h3 className="mt-4 font-semibold">{t.label}</h3>
                  <p className="mt-1 text-sm text-paper/60">{t.blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {collections.length > 0 && (
        <section className="container-x pt-20 md:pt-28" aria-labelledby="collections">
          <div className="flex items-end justify-between gap-6">
            <h2 id="collections" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
              Collections
            </h2>
            <Link href="/collections" className="label text-mute hover:text-lemon">
              See all →
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 3).map((c) => (
              <li key={c.id}>
                <CollectionCard collection={c} cover={collectionCover(c, products)} count={products.filter((p) => p.collectionIds.includes(c.id)).length} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-20 md:pt-28" aria-labelledby="featured">
        <div className="flex items-end justify-between gap-6">
          <h2 id="featured" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
            Fresh <span className="text-lemon">drops</span>
          </h2>
          <Link href="/shop" className="label text-mute hover:text-lemon">
            See all →
          </Link>
        </div>
        {shown.length ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {shown.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 4) * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-paper/70">The catalog is being stocked. Check back soon.</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="container-x pt-20 md:pt-28" aria-labelledby="upcoming">
          <h2 id="upcoming" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
            Coming <span className="text-lemon">soon</span>
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {upcoming.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-20 md:pt-28" aria-labelledby="how">
        <h2 id="how" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
          How it <span className="text-lemon">works</span>
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { t: "Fill your cart", b: "Pick designs, sizes and finishes. Offers apply on their own." },
            { t: "Place your order", b: "Add your details and tap once. You get an order page to track it, and send the order to us in an Instagram DM." },
            { t: "Stick it", b: settings.deliveryNote || "We pack it and send it your way." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-[1.5rem] border border-line p-6 md:p-8">
              <span className="label text-lemon">0{i + 1}</span>
              <h3 className="display mt-4 text-4xl">{s.t}</h3>
              <p className="mt-3 text-paper/70">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-x pt-20 md:pt-28" aria-labelledby="stalls">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="stalls" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
            At our <span className="text-lemon">stalls</span>
          </h2>
          <a href="https://instagram.com/stixnvibes" target="_blank" rel="noopener" className="label text-mute hover:text-lemon">
            More on Instagram →
          </a>
        </div>
        <div className="mt-8">
          <StallReels />
        </div>
      </section>

      <section className="container-x pt-20 md:pt-28">
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-line px-6 py-16 text-center md:px-16 md:py-24">
          <img src="/lofi/lofi-04.webp" alt="" className="sticker-shadow absolute left-6 top-6 hidden w-28 -rotate-12 md:block" />
          <img src="/lofi/lofi-13.webp" alt="" className="sticker-shadow absolute bottom-6 right-6 hidden w-32 rotate-12 md:block" />
          <h2 className="display text-[clamp(2.8rem,9vw,8rem)]">Bulk or custom?</h2>
          <p className="mx-auto mt-6 max-w-lg text-paper/75">{settings.bulkNote || "Clubs, fests, shops, your own artwork: message us and we'll quote."}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href={dmLink(settings.instagramHandle)} className="btn btn-primary" target="_blank" rel="noopener">
              Message us on Instagram
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
