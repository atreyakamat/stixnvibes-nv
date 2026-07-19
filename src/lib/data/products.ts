/**
 * Mock product catalog used until Supabase is wired.
 * Schema mirrors the `products` table in supabase/schema.sql.
 */

export type ProductType = "sticker_normal" | "sticker_vinyl" | "poster" | "spotify_card" | "frame" | "mystery_pack";
export type ProductTag = "new" | "bestseller" | "offer" | "premium" | "customizable";

export type Product = {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  category: string;
  collection: string;
  price: number;
  compareAt?: number;
  currency: "INR";
  rating: number;
  reviewCount: number;
  image: string;
  images: string[];
  tags: ProductTag[];
  customizable: boolean;
  description: string;
  badge?: string;
};

// Using Unsplash for placeholder imagery. Replace with Cloudinary in production.
const IMG = {
  anime: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
  cyber: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  neon: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
  music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  poster: "https://images.unsplash.com/photo-1567880905833-5623eb9a4c7d?auto=format&fit=crop&w=800&q=80",
  frame: "https://images.unsplash.com/photo-1567016526105-22da7c5b1d9d9?auto=format&fit=crop&w=800&q=80",
  car: "https://images.unsplash.com/photo-1503376780353-7a6d8d6e1d2e?auto=format&fit=crop&w=800&q=80",
  football: "https://images.unsplash.com/photo-1574629810360-3ef849d6c5d8?auto=format&fit=crop&w=800&q=80",
  gaming: "https://images.unsplash.com/photo-1542751371-adc294aa6a4d?auto=format&fit=crop&w=800&q=80",
  purple: "https://images.unsplash.com/photo-1604871000636-074cf5a5453e?auto=format&fit=crop&w=800&q=80",
  orange: "https://images.unsplash.com/photo-1611162616305-c69b046b5336?auto=format&fit=crop&w=800&q=80",
  gradient: "https://images.unsplash.com/photo-1557682204-e7d8d55d9b53?auto=format&fit=crop&w=800&q=80",
};

const stickers: Product[] = [
  { id: "s1", slug: "anime-heroes-sticker-pack", name: "Anime Heroes Sticker Pack", type: "sticker_normal", category: "Stickers", collection: "Anime", price: 199, compareAt: 299, currency: "INR", rating: 4.8, reviewCount: 1423, image: IMG.anime, images: [IMG.anime, IMG.neon], tags: ["bestseller", "new"], customizable: false, description: "A premium pack of 12 vinyl-coated stickers featuring your favourite anime heroes." },
  { id: "s2", slug: "f1-speed-sticker", name: "F1 Speed Sticker", type: "sticker_vinyl", category: "Stickers", collection: "Formula 1", price: 149, currency: "INR", rating: 4.7, reviewCount: 821, image: IMG.car, images: [IMG.car], tags: ["new"], customizable: false, description: "UV-resistant, waterproof vinyl sticker for helmets, laptop & bottles." },
  { id: "s3", slug: "marvel-iron-sticker", name: "Marvel Iron Sticker", type: "sticker_normal", category: "Stickers", collection: "Marvel", price: 99, currency: "INR", rating: 4.6, reviewCount: 542, image: IMG.neon, images: [IMG.neon], tags: ["bestseller"], customizable: false, description: "Glossy finish marvel sticker, 4-inch, die-cut precision." },
  { id: "s4", slug: "pixel-gamer-pack", name: "Pixel Gamer Pack", type: "sticker_vinyl", category: "Stickers", collection: "Gaming", price: 249, compareAt: 329, currency: "INR", rating: 4.9, reviewCount: 988, image: IMG.gaming, images: [IMG.gaming], tags: ["bestseller", "new"], customizable: true, description: "14-piece retro & modern gaming sticker pack. Build your controller vibes." },
  { id: "s5", slug: "lofi-quotes-sticker", name: "Lo-Fi Quotes Sticker", type: "sticker_normal", category: "Stickers", collection: "Quotes", price: 79, currency: "INR", rating: 4.5, reviewCount: 233, image: IMG.music, images: [IMG.music], tags: ["offer"], customizable: false, description: "Soft-tone matte sticker with carefully picked quotes that hit different at 2 AM." },
];

const posters: Product[] = [
  { id: "p1", slug: "anime-neon-a3-poster", name: "Anime Neon A3 Poster", type: "poster", category: "Posters", collection: "Anime", price: 349, compareAt: 449, currency: "INR", rating: 4.9, reviewCount: 1205, image: IMG.purple, images: [IMG.purple], tags: ["bestseller", "new"], customizable: true, description: "300 GSM matte A3 poster. Vivid archival inks, fade-resistant up to 70 years.", badge: "Best Seller" },
  { id: "p2", slug: "marvel-cinematic-a4-poster", name: "Marvel Cinematic A4 Poster", type: "poster", category: "Posters", collection: "Marvel", price: 199, currency: "INR", rating: 4.7, reviewCount: 612, image: IMG.neon, images: [IMG.neon], tags: [], customizable: true, description: "A4 premium matte poster for your cinematic timeline wall." },
  { id: "p3", slug: "minimal-monochrome-a5", name: "Minimal Monochrome A5", type: "poster", category: "Posters", collection: "Minimal", price: 99, currency: "INR", rating: 4.6, reviewCount: 320, image: IMG.gradient, images: [IMG.gradient], tags: ["new"], customizable: true, description: "Sleek minimal A5 print — perfect for gallery wall starts." },
  { id: "p4", slug: "f1-race-day-a3-poster", name: "F1 Race Day A3 Poster", type: "poster", category: "Posters", collection: "Formula 1", price: 399, compareAt: 499, currency: "INR", rating: 4.8, reviewCount: 456, image: IMG.car, images: [IMG.car], tags: ["offer"], customizable: true, description: "High-octane A3 race day poster, museum-quality print." },
];

const spotifyCards: Product[] = [
  { id: "sc1", slug: "spotify-ready-khuddar-card", name: "Spotify Ready — 'Khuddar' Card", type: "spotify_card", category: "Spotify Cards", collection: "Ready Designs", price: 249, currency: "INR", rating: 4.9, reviewCount: 1872, image: IMG.music, images: [IMG.music], tags: ["bestseller"], customizable: false, description: "Pre-designed custom Spotify card with scannable QR — instant nostalgia to any track.", badge: "Best Seller" },
  { id: "sc2", slug: "spotify-custom-photo-card", name: "Custom Photo Spotify Card", type: "spotify_card", category: "Spotify Cards", collection: "Customize", price: 299, currency: "INR", rating: 5, reviewCount: 2410, image: IMG.purple, images: [IMG.purple], tags: ["bestseller", "new", "customizable"], customizable: true, description: "Upload your photo, paste a Spotify link, and we print your moment on premium 300 GSM card.", badge: "Top Custom" },
  { id: "sc3", slug: "spotify-couple-frame-set", name: "Spotify Couple Frame Set", type: "spotify_card", category: "Spotify Cards", collection: "Ready Designs", price: 599, compareAt: 799, currency: "INR", rating: 4.9, reviewCount: 731, image: IMG.gradient, images: [IMG.gradient], tags: ["offer"], customizable: true, description: "Set of 2 framed Spotify cards — gift ready, frame ready, scan ready." },
];

const frames: Product[] = [
  { id: "f1", slug: "premium-black-frame-a3", name: "Premium Black Frame (A3)", type: "frame", category: "Frames", collection: "Premium", price: 799, currency: "INR", rating: 4.8, reviewCount: 521, image: IMG.frame, images: [IMG.frame], tags: ["bestseller", "premium"], customizable: true, description: "Solid wood premium matte black frame with shatterproof acrylic, ready to mount.", badge: "Premium" },
  { id: "f2", slug: "white-minimal-frame-a4", name: "White Minimal Frame (A4)", type: "frame", category: "Frames", collection: "Standard", price: 449, currency: "INR", rating: 4.7, reviewCount: 389, image: IMG.gradient, images: [IMG.gradient], tags: [], customizable: true, description: "Clean white MDF frame with glass front. Perfect for posters and Spotify cards." },
  { id: "f3", slug: "oak-wood-frame-a3", name: "Natural Oak Wood Frame", type: "frame", category: "Frames", collection: "Premium", price: 899, compareAt: 1099, currency: "INR", rating: 4.9, reviewCount: 612, image: IMG.poster, images: [IMG.poster], tags: ["premium", "offer"], customizable: true, description: "Real natural oak wood with satin finish — gallery quality at home." },
];

const mystery: Product[] = [
  { id: "m1", slug: "anime-mystery-pack", name: "Anime Mystery Pack", type: "mystery_pack", category: "Mystery Pack", collection: "Anime", price: 299, compareAt: 499, currency: "INR", rating: 4.8, reviewCount: 1410, image: IMG.anime, images: [IMG.anime], tags: ["bestseller", "offer"], customizable: false, description: "10 surprise anime stickers + 1 rare holo. Unboxing joy guaranteed." },
  { id: "m2", slug: "gaming-mystery-pack", name: "Gaming Mystery Pack", type: "mystery_pack", category: "Mystery Pack", collection: "Gaming", price: 349, currency: "INR", rating: 4.7, reviewCount: 712, image: IMG.gaming, images: [IMG.gaming], tags: ["new"], customizable: false, description: "12 gaming stickers + 1 controller magnet. Luck rolled into a pack." },
  { id: "m3", slug: "premium-mystery-pack", name: "Premium Mystery Pack", type: "mystery_pack", category: "Mystery Pack", collection: "Premium", price: 599, currency: "INR", rating: 4.9, reviewCount: 320, image: IMG.purple, images: [IMG.purple], tags: ["premium", "offer"], customizable: false, description: "Mix of 5 vinyl stickers, 1 mini poster, 1 Spotify card, and 1 rare holo.", badge: "Premium" },
  { id: "m4", slug: "f1-football-mystery-pack", name: "F1 × Football Mystery Pack", type: "mystery_pack", category: "Mystery Pack", collection: "Random Mix", price: 249, currency: "INR", rating: 4.6, reviewCount: 215, image: IMG.football, images: [IMG.football], tags: ["new"], customizable: false, description: "Mixed sports theme — speed and pitch vibes in surprise format." },
];

export const products: Product[] = [...stickers, ...posters, ...spotifyCards, ...frames, ...mystery];

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string) {
  return products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

export function getProductsByTag(tag: ProductTag) {
  return products.filter((p) => p.tags.includes(tag));
}

export function getBestSellers() {
  return products.filter((p) => p.tags.includes("bestseller")).slice(0, 8);
}

export function getNewArrivals() {
  return products.filter((p) => p.tags.includes("new")).slice(0, 6);
}

export const featuredCategories = [
  {
    title: "Stickers",
    description: "Normal & vinyl. Anime, Marvel, F1, Gaming & more.",
    href: "/shop/stickers",
    icon: "Sticker",
    image: IMG.anime,
    gradient: "from-yellow-400 via-orange-500 to-red-500",
  },
  {
    title: "Posters",
    description: "A5, A4, A3 & custom. Architectural print quality.",
    href: "/shop/posters",
    icon: "Poster",
    image: IMG.purple,
    gradient: "from-purple-500 via-fuchsia-500 to-red-500",
  },
  {
    title: "Spotify Cards",
    description: "Pre-designed or fully customized music cards.",
    href: "/shop/spotify-cards",
    icon: "Music",
    image: IMG.music,
    gradient: "from-green-400 via-yellow-500 to-orange-500",
  },
  {
    title: "Frames",
    description: "Premium wood, matte black, white minimal.",
    href: "/shop/frames",
    icon: "Frame",
    image: IMG.frame,
    gradient: "from-orange-500 via-red-500 to-purple-600",
  },
  {
    title: "Mystery Packs",
    description: "Surprise drops across collections. Unbox joy.",
    href: "/shop/mystery",
    icon: "Gift",
    image: IMG.gaming,
    gradient: "from-pink-500 via-purple-500 to-orange-500",
  },
] as const;

export const trendingCollections = [
  { title: "Anime", count: 142, href: "/shop/stickers/anime", gradient: "from-fuchsia-500 via-purple-500 to-rose-500", emoji: "🌸" },
  { title: "Marvel", count: 96, href: "/shop/stickers/marvel", gradient: "from-red-500 via-orange-500 to-yellow-500", emoji: "🦸" },
  { title: "Football", count: 58, href: "/shop/stickers/football", gradient: "from-green-500 via-emerald-500 to-cyan-500", emoji: "⚽" },
  { title: "Cars", count: 73, href: "/shop/stickers/cars", gradient: "from-orange-500 via-amber-500 to-yellow-500", emoji: "🏎️" },
  { title: "Gaming", count: 121, href: "/shop/stickers/gaming", gradient: "from-violet-500 via-purple-500 to-fuchsia-500", emoji: "🎮" },
  { title: "Formula 1", count: 65, href: "/shop/stickers/f1", gradient: "from-red-500 via-rose-500 to-pink-500", emoji: "🏁" },
  { title: "Music", count: 44, href: "/shop/stickers/music", gradient: "from-cyan-500 via-blue-500 to-purple-500", emoji: "🎧" },
  { title: "Movies", count: 87, href: "/shop/stickers/movies", gradient: "from-amber-500 via-orange-500 to-red-500", emoji: "🎬" },
  { title: "Minimal", count: 52, href: "/shop/posters/minimal", gradient: "from-slate-500 via-zinc-500 to-gray-500", emoji: "⚪" },
] as const;

export const reviews = [
  {
    name: "Aarav Mehta",
    location: "Mumbai",
    rating: 5,
    text: "The custom Spotify card I made for my girlfriend straight-up won me boyfriend of the year. Print quality is unreal.",
    product: "Custom Photo Spotify Card",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Ishita Rao",
    location: "Bengaluru",
    rating: 5,
    text: "Anime Mystery Pack was a proper unboxing experience. Got the rare holo on the first pack — pure dopamine.",
    product: "Anime Mystery Pack",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Rohan Verma",
    location: "Delhi",
    rating: 4,
    text: "Vinyl F1 sticker stuck to my helmet for 2 monsoons now and still looks brand new. Worth every rupee.",
    product: "F1 Speed Sticker",
    avatar: "https://images.unsplash.com/photo-1500648766835-cf79d2c98e60?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Sara Khan",
    location: "Hyderabad",
    rating: 5,
    text: "Premium black frame is exactly the Black Forest aesthetic I wanted. Wood is heavy & premium.",
    product: "Premium Black Frame (A3)",
    avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d77df?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Karthik Nair",
    location: "Kochi",
    rating: 5,
    text: "A3 anime neon poster print is SO crisp. My entire wall finally feels like *me*.",
    product: "Anime Neon A3 Poster",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Neha Sharma",
    location: "Pune",
    rating: 5,
    text: "Customised a poster with my own photo + song link for our anniversary. The team *got* it.",
    product: "Custom Photo Spotify Card",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  },
] as const;

export const instagramPosts = [
  { id: 1, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1611605699335-2a2a2a2a2a2a?auto=format&fit=crop&w=400&q=80", caption: "Anime Drop" },
  { id: 2, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1531259684878-7addab9ab4e0?auto=format&fit=crop&w=400&q=80", caption: "Wall decor" },
  { id: 3, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80", caption: "Spotify cards" },
  { id: 4, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80", caption: "Frame game" },
  { id: 5, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1577720580479-7d839e8a64c8?auto=format&fit=crop&w=400&q=80", caption: "Mystery unpack" },
  { id: 6, href: "https://instagram.com/stixnvibes", image: "https://images.unsplash.com/photo-1572043780279-0106-92f0-4a2a2a2a2a2a?auto=format&fit=crop&w=400&q=80", caption: "Custom posters" },
] as const;
