export const siteConfig = {
  name: "Stix N Vibes",
  shortName: "StixNvibes",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://stixnvibes.com",
  description:
    "Premium stickers, posters, Spotify cards, frames and mystery packs. Customize, vibe, and stick it loud — Stix N Vibes.",
  tagline: "Stick Loud. Vibe Harder.",
  subTagline:
    "Premium stickers, posters, Spotify cards & frames. Designed to make every wall, laptop, and moment feel like yours.",
  social: {
    instagram: "https://instagram.com/stixnvibes",
    twitter: "https://twitter.com/stixnvibes",
    youtube: "https://youtube.com/@stixnvibes",
    tiktok: "https://tiktok.com/@stixnvibes",
    whatsapp: "https://wa.me/919999999999",
    email: "hello@stixnvibes.com",
  },
  contact: {
    phone: "+91 99999 99999",
    hours: "Mon–Sat, 10:00 AM – 7:00 PM IST",
    address: "Bengaluru, India",
  },
  freeShippingThreshold: 499,
};

export type SiteConfig = typeof siteConfig;

export const navStructure = [
  {
    title: "Shop",
    href: "/shop",
    mega: [
      {
        title: "Stickers",
        links: [
          { title: "Normal Stickers", href: "/shop/stickers/normal" },
          { title: "Vinyl Stickers", href: "/shop/stickers/vinyl" },
          { title: "Anime", href: "/shop/stickers/anime" },
          { title: "Marvel", href: "/shop/stickers/marvel" },
          { title: "Gaming", href: "/shop/stickers/gaming" },
          { title: "Custom Stickers", href: "/customize/stickers" },
        ],
      },
      {
        title: "Posters",
        links: [
          { title: "A5 Posters", href: "/shop/posters/a5" },
          { title: "A4 Posters", href: "/shop/posters/a4" },
          { title: "A3 Posters", href: "/shop/posters/a3" },
          { title: "Custom Posters", href: "/customize/posters" },
          { title: "Minimal", href: "/shop/posters/minimal" },
          { title: "Aesthetic", href: "/shop/posters/aesthetic" },
        ],
      },
      {
        title: "Cards & Frames",
        links: [
          { title: "Spotify Cards — Ready", href: "/shop/spotify-cards/ready" },
          { title: "Spotify Cards — Custom", href: "/customize/spotify-card" },
          { title: "Standard Frames", href: "/shop/frames/standard" },
          { title: "Premium Frames", href: "/shop/frames/premium" },
          { title: "Custom Frames", href: "/customize/frames" },
        ],
      },
      {
        title: "Mystery & More",
        links: [
          { title: "Anime Mystery Pack", href: "/shop/mystery/anime" },
          { title: "Gaming Mystery Pack", href: "/shop/mystery/gaming" },
          { title: "Football Mystery Pack", href: "/shop/mystery/football" },
          { title: "Premium Mystery Pack", href: "/shop/mystery/premium" },
          { title: "Random Mix", href: "/shop/mystery/random" },
        ],
      },
    ],
  },
  { title: "New Arrivals", href: "/shop?filter=new" },
  { title: "Best Sellers", href: "/shop?filter=popular" },
  { title: "Custom Orders", href: "/customize" },
  { title: "Offers", href: "/shop?filter=offers", highlight: true },
  { title: "About", href: "/about" },
  { title: "FAQ", href: "/faq" },
  { title: "Contact", href: "/contact" },
] as const;
