// Shop copy and contact facts. Contacts match stixnvibes.com.

export const site = {
  name: "Stix N Vibes",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.stixnvibes.com",
  mainSite: "https://www.stixnvibes.com",
  tagline: "Your stickers. Your vibe.",
  description:
    "Shop Stix N Vibes: stickers from ₹10, super sheets, A4 and A3 posters, Spotify music cards and wall cards from a student-led brand in Goa. Order on Instagram.",
  origin: "From Goa, for everywhere.",
  contact: {
    email: "hello@stixnvibes.com",
    instagram: "https://instagram.com/stixnvibes",
    instagramHandle: "@stixnvibes",
    instagramDm: "https://ig.me/m/stixnvibes",
  },
} as const;

export const nav = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?type=sticker", label: "Stickers" },
  { href: "/shop?type=poster", label: "Posters" },
  { href: "/shop?type=music-card", label: "Music cards" },
  { href: "/collections", label: "Collections" },
  { href: "/custom", label: "Custom" },
] as const;

/** Everything that isn't a product list: the footer and the mobile menu. */
export const moreNav = [
  { href: "/bundle", label: "Build a pack" },
  { href: "/gallery", label: "Library" },
  { href: "/blog", label: "Blog" },
  { href: "/c", label: "Colleges" },
] as const;
