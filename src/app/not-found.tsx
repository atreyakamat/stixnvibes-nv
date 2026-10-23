import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-x flex flex-1 flex-col justify-center py-24">
      <h1 className="display text-[clamp(3.2rem,10vw,8rem)]">
        Peeled <span className="text-lemon">off.</span>
      </h1>
      <p className="mt-6 text-lg text-paper/75">This page doesn&apos;t exist.</p>
      <Link href="/shop" className="btn btn-primary mt-8 w-fit">
        Back to the shop
      </Link>
    </main>
  );
}
