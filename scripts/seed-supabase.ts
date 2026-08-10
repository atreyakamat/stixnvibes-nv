import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categoriesData = [
  { name: "Stickers", slug: "stickers", icon: "sparkles", sortOrder: 1, isFeatured: true },
  { name: "Posters", slug: "posters", icon: "image", sortOrder: 2, isFeatured: true },
  { name: "Spotify Cards", slug: "spotify-cards", icon: "music", sortOrder: 3, isFeatured: true },
  { name: "Frames", slug: "frames", icon: "frame", sortOrder: 4, isFeatured: false },
  { name: "Mystery Pack", slug: "mystery-pack", icon: "package", sortOrder: 5, isFeatured: true },
];

const mockProducts = [
  {
    name: "Anime Heroes Sticker Pack",
    slug: "anime-heroes-sticker-pack",
    type: "sticker" as const,
    categorySlug: "stickers",
    collection: "Anime",
    priceCents: 19900,
    compareAtCents: 29900,
    rating: 4.8,
    reviewCount: 1423,
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "new"],
    customizable: false,
    description: "A premium pack of 12 vinyl-coated stickers featuring your favourite anime heroes.",
    stock: 50,
    isFeatured: true,
  },
  {
    name: "F1 Speed Sticker",
    slug: "f1-speed-sticker",
    type: "sticker_vinyl" as const,
    categorySlug: "stickers",
    collection: "Formula 1",
    priceCents: 14900,
    rating: 4.7,
    reviewCount: 821,
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7a6d8d6e1d2e?auto=format&fit=crop&w=800&q=80",
    tags: ["new"],
    customizable: false,
    description: "UV-resistant, waterproof vinyl sticker for helmets, laptop & bottles.",
    stock: 35,
    isFeatured: false,
  },
  {
    name: "Pixel Gamer Pack",
    slug: "pixel-gamer-pack",
    type: "sticker_vinyl" as const,
    categorySlug: "stickers",
    collection: "Gaming",
    priceCents: 24900,
    compareAtCents: 32900,
    rating: 4.9,
    reviewCount: 988,
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc294aa6a4d?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "new"],
    customizable: true,
    description: "14-piece retro & modern gaming sticker pack. Build your controller vibes.",
    stock: 40,
    isFeatured: true,
  },
  {
    name: "Anime Neon A3 Poster",
    slug: "anime-neon-a3-poster",
    type: "poster" as const,
    categorySlug: "posters",
    collection: "Anime",
    priceCents: 34900,
    compareAtCents: 44900,
    rating: 4.9,
    reviewCount: 1205,
    imageUrl: "https://images.unsplash.com/photo-1604871000636-074cf5a5453e?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "new"],
    customizable: true,
    description: "300 GSM matte A3 poster. Vivid archival inks, fade-resistant up to 70 years.",
    stock: 25,
    isFeatured: true,
  },
  {
    name: "Spotify Ready — 'Khuddar' Card",
    slug: "spotify-ready-khuddar-card",
    type: "spotify_card" as const,
    categorySlug: "spotify-cards",
    collection: "Ready Designs",
    priceCents: 24900,
    rating: 4.9,
    reviewCount: 1872,
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller"],
    customizable: false,
    description: "Pre-designed custom Spotify card with scannable QR — instant nostalgia to any track.",
    stock: 60,
    isFeatured: true,
  },
  {
    name: "Custom Photo Spotify Card",
    slug: "spotify-custom-photo-card",
    type: "spotify_card" as const,
    categorySlug: "spotify-cards",
    collection: "Customize",
    priceCents: 29900,
    rating: 5.0,
    reviewCount: 2410,
    imageUrl: "https://images.unsplash.com/photo-1604871000636-074cf5a5453e?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "new", "customizable"],
    customizable: true,
    description: "Upload your photo, paste a Spotify link, and we print your moment on premium 300 GSM card.",
    stock: 100,
    isFeatured: true,
  },
  {
    name: "Premium Black Frame (A3)",
    slug: "premium-black-frame-a3",
    type: "frame" as const,
    categorySlug: "frames",
    collection: "Premium",
    priceCents: 79900,
    rating: 4.8,
    reviewCount: 521,
    imageUrl: "https://images.unsplash.com/photo-1567016526105-22da7c5b1d9d9?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "premium"],
    customizable: true,
    description: "Solid wood premium matte black frame with shatterproof acrylic, ready to mount.",
    stock: 15,
    isFeatured: true,
  },
  {
    name: "Anime Mystery Pack",
    slug: "anime-mystery-pack",
    type: "mystery_pack" as const,
    categorySlug: "mystery-pack",
    collection: "Anime",
    priceCents: 29900,
    compareAtCents: 49900,
    rating: 4.8,
    reviewCount: 1410,
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    tags: ["bestseller", "offer"],
    customizable: false,
    description: "10 surprise anime stickers + 1 rare holo. Unboxing joy guaranteed.",
    stock: 45,
    isFeatured: true,
  },
];

async function main() {
  console.log("🌱 Starting Supabase database seeding via Prisma...");

  // Seed Categories
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder, isFeatured: cat.isFeatured },
      create: cat,
    });
    categoryMap.set(cat.slug, created.id);
    console.log(`✓ Category upserted: ${created.name}`);
  }

  // Seed Collections
  const collectionsData = [
    { name: "Anime", slug: "anime", sortOrder: 1, isFeatured: true },
    { name: "Formula 1", slug: "formula-1", sortOrder: 2, isFeatured: false },
    { name: "Gaming", slug: "gaming", sortOrder: 3, isFeatured: true },
    { name: "Ready Designs", slug: "ready-designs", sortOrder: 4, isFeatured: false },
    { name: "Customize", slug: "customize", sortOrder: 5, isFeatured: true },
    { name: "Premium", slug: "premium", sortOrder: 6, isFeatured: false },
  ];

  const collectionMap = new Map<string, string>();
  for (const coll of collectionsData) {
    const created = await prisma.collection.upsert({
      where: { slug: coll.slug },
      update: { name: coll.name, sortOrder: coll.sortOrder, isFeatured: coll.isFeatured },
      create: coll,
    });
    collectionMap.set(coll.name, created.id);
    console.log(`✓ Collection upserted: ${created.name}`);
  }

  // Seed Products
  for (const prod of mockProducts) {
    const { categorySlug, collection, ...prodData } = prod;
    const categoryId = categoryMap.get(categorySlug);
    const collectionId = collectionMap.get(collection);

    const created = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: {
        name: prodData.name,
        priceCents: prodData.priceCents,
        compareAtCents: prodData.compareAtCents,
        description: prodData.description,
        imageUrl: prodData.imageUrl,
        stock: prodData.stock,
        isFeatured: prodData.isFeatured,
        customizable: prodData.customizable,
        categoryId: categoryId ?? null,
        collectionId: collectionId ?? null,
      },
      create: {
        ...prodData,
        categoryId: categoryId ?? null,
        collectionId: collectionId ?? null,
      },
    });
    console.log(`✓ Product upserted: ${created.name} (₹${created.priceCents / 100})`);
  }

  console.log("🎉 Supabase database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
