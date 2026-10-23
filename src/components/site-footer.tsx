import Link from "next/link";
import { nav, site, whatsappLink } from "@/content/site";
import { Wordmark } from "./wordmark";

const policies = [
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/returns", label: "Returns" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-ink">
      <div className="container-x grid gap-12 pb-10 pt-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark className="text-3xl" />
          <p className="mt-4 max-w-sm text-mute">{site.description}</p>
        </div>
        <nav aria-label="Shop" className="md:col-span-2">
          <p className="label text-mute">Shop</p>
          <ul className="mt-4 space-y-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-lemon">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Policies" className="md:col-span-2">
          <p className="label text-mute">Policies</p>
          <ul className="mt-4 space-y-2">
            {policies.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-lemon">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3">
          <p className="label text-mute">Talk to us</p>
          <ul className="mt-4 space-y-2">
            <li>
              <a href={site.contact.instagram} className="hover:text-lemon" rel="noopener" target="_blank">
                Instagram {site.contact.instagramHandle}
              </a>
            </li>
            <li>
              <a href={whatsappLink()} className="hover:text-lemon" rel="noopener" target="_blank">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contact.email}`} className="hover:text-lemon">
                {site.contact.email}
              </a>
            </li>
            <li>
              <a href={site.mainSite} className="hover:text-lemon">
                stixnvibes.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-x overflow-hidden" aria-hidden="true">
        <p className="display select-none whitespace-nowrap text-[21.5vw] leading-[0.8] text-surface-2 lg:text-[min(21.5vw,19.5rem)]">
          Make it stick
        </p>
      </div>

      <div className="container-x flex flex-col gap-2 border-t border-line py-6 text-sm text-mute sm:flex-row sm:justify-between">
        <p>
          © {year} {site.name}. {site.origin}
        </p>
        <p>A student-led startup.</p>
      </div>
    </footer>
  );
}
