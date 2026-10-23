import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x pb-10 pt-16 md:pt-24">
      <p className="label text-mute">404</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,8rem)]">
        Peeled <span className="text-lemon">off.</span>
      </h1>
      <p className="mt-6 max-w-md text-lg text-paper/75">This page doesn&apos;t exist, or the link is missing a piece.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-primary">
          Back to the shop
        </Link>
        <Link href="/track" className="btn btn-ghost">
          Track an order
        </Link>
      </div>
    </section>
  );
}
