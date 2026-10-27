import type { Metadata } from "next";
import Link from "next/link";
import { getColleges } from "@/lib/content";

export const revalidate = 60;
export const metadata: Metadata = { title: "Colleges", description: "Find your college: its code, our picks for it and when our stall is there next.", alternates: { canonical: "/c" } };

export default async function CollegesPage() {
  const colleges = await getColleges();
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Colleges</p>
      <h1 className="display mt-3 text-[clamp(3rem,9vw,6.5rem)]">
        Find your <span className="text-lemon">college</span>
      </h1>
      {colleges.length ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="ice block rounded-[1.5rem] border border-line p-6 transition-colors hover:border-lemon/60">
                <span className="block text-xl font-semibold">{c.name}</span>
                {c.area && <span className="mt-1 block text-sm text-mute">{c.area}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-paper/70">Coming soon.</p>
      )}
    </section>
  );
}
