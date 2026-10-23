// Shop copy and contact facts. Contacts match stixnvibes.com; confirm them in
// the questionnaire before launch.

export const site = {
  name: "Stix N Vibes",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.stixnvibes.com",
  mainSite: "https://www.stixnvibes.com",
  tagline: "Your stickers. Your vibe.",
  description:
    "Shop Stix N Vibes: waterproof stickers, sticker packs, peel-to-paste posters and Framez from a student-led brand in Goa.",
  origin: "From Goa, for everywhere.",
  contact: {
    email: "hello@stixnvibes.com",
    instagram: "https://instagram.com/stixnvibes",
    instagramHandle: "@stixnvibes",
    instagramDm: "https://ig.me/m/stixnvibes",
    whatsappNumber: "917744020601",
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.contact.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const nav = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=stickers", label: "Stickers" },
  { href: "/shop?category=posters", label: "Posters" },
  { href: "/custom", label: "Custom" },
  { href: "/track", label: "Track order" },
] as const;
