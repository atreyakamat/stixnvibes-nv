import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with production-ready data...");

  // 1. Collections
  const collectionsData = [
    { name: "Anime", slug: "anime", description: "Top anime stickers and posters" },
    { name: "Marvel", slug: "marvel", description: "Marvel cinematic universe merch" },
    { name: "Gaming", slug: "gaming", description: "For the true gamers" },
    { name: "Goa", slug: "goa", description: "Tropical vibes and party scenes" },
    { name: "Travel", slug: "travel", description: "Wanderlust inspired" },
    { name: "Nature", slug: "nature", description: "Botanicals, landscapes, and wildlife" },
    { name: "Minimal", slug: "minimal", description: "Clean, simple, aesthetic designs" },
    { name: "Quotes", slug: "quotes", description: "Typography and daily inspiration" },
    { name: "Festivals", slug: "festivals", description: "Celebrate life" },
    { name: "Trending", slug: "trending", description: "What everyone is buying right now" },
  ];

  const createdCollections = [];
  for (const c of collectionsData) {
    const coll = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, description: c.description },
    });
    createdCollections.push(coll);
  }
  console.log(`✅ Seeded ${createdCollections.length} collections.`);

  // 2. Categories
  const categoriesData = [
    { name: "Die-cut Stickers", slug: "die-cut-stickers", icon: "" },
    { name: "Holographic Stickers", slug: "holographic-stickers", icon: "" },
    { name: "Laptop Decals", slug: "laptop-decals", icon: "" },
    { name: "Bumper Stickers", slug: "bumper-stickers", icon: "" },
    { name: "Clear Stickers", slug: "clear-stickers", icon: "" },
    { name: "Vinyl Posters", slug: "vinyl-posters", icon: "" },
    { name: "Art Prints", slug: "art-prints", icon: "" },
    { name: "Sticker Packs", slug: "sticker-packs", icon: "" },
    { name: "Custom Stickers", slug: "custom-stickers", icon: "" },
    { name: "Mini Stickers", slug: "mini-stickers", icon: "" },
  ];

  const createdCategories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, icon: c.icon },
    });
    createdCategories.push(cat);
  }
  console.log(`✅ Seeded ${createdCategories.length} categories.`);

  // 3. Materials
  const materialsData = [
    { name: "Premium Vinyl", slug: "premium-vinyl" },
    { name: "Holographic", slug: "holographic" },
    { name: "Transparent", slug: "transparent" },
    { name: "Gloss Paper", slug: "gloss-paper" },
    { name: "Matte Paper", slug: "matte-paper" },
  ];

  for (const m of materialsData) {
    // We don't have a specific Materials table yet? Wait, let's check schema.
    // If not, we skip. Oh wait, I didn't create a materials table, it's just fetched from somewhere or hardcoded.
  }

  // 4. Products
  const productsData = [
    {
      name: "Gojo Satoru Hollow Purple Sticker",
      slug: "gojo-hollow-purple",
      description: "Premium die-cut vinyl sticker of Gojo Satoru casting Hollow Purple.",
      priceCents: 14900,
      compareAtCents: 24900,
      collectionId: createdCollections.find(c => c.slug === "anime")?.id,
      categoryId: createdCategories.find(c => c.slug === "die-cut-stickers")?.id,
      imageUrl: "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop"],
      type: "sticker",
      tags: ["anime", "bestseller", "new"],
      stock: 50,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 128,
    },
    {
      name: "Iron Man Arc Reactor Decal",
      slug: "iron-man-arc-reactor",
      description: "Holographic Iron Man Arc Reactor decal for laptops.",
      priceCents: 19900,
      compareAtCents: 29900,
      collectionId: createdCollections.find(c => c.slug === "marvel")?.id,
      categoryId: createdCategories.find(c => c.slug === "holographic-stickers")?.id,
      imageUrl: "https://images.unsplash.com/photo-1534030630739-1663f73ee584?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1534030630739-1663f73ee584?q=80&w=800&auto=format&fit=crop"],
      type: "sticker",
      tags: ["marvel", "bestseller"],
      stock: 120,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 95,
    },
    {
      name: "Cyberpunk Cityscape Poster",
      slug: "cyberpunk-cityscape-poster",
      description: "High-quality A3 vinyl poster of a neon cyberpunk city.",
      priceCents: 49900,
      compareAtCents: 69900,
      collectionId: createdCollections.find(c => c.slug === "gaming")?.id,
      categoryId: createdCategories.find(c => c.slug === "vinyl-posters")?.id,
      imageUrl: "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=800&auto=format&fit=crop"],
      type: "poster",
      tags: ["gaming", "neon"],
      stock: 15,
      isFeatured: true,
      rating: 5.0,
      reviewCount: 42,
    },
    {
      name: "Goa Beach Vibes Sticker Pack",
      slug: "goa-beach-vibes-pack",
      description: "Pack of 10 tropical stickers inspired by Goa.",
      priceCents: 29900,
      compareAtCents: 49900,
      collectionId: createdCollections.find(c => c.slug === "goa")?.id,
      categoryId: createdCategories.find(c => c.slug === "sticker-packs")?.id,
      imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop"],
      type: "mystery_pack",
      tags: ["travel", "goa", "summer"],
      stock: 30,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 18,
    },
    {
      name: "Minimalist Mountain Decal",
      slug: "minimal-mountain",
      description: "Clean, black and white mountain line art decal.",
      priceCents: 9900,
      compareAtCents: 14900,
      collectionId: createdCollections.find(c => c.slug === "minimal")?.id,
      categoryId: createdCategories.find(c => c.slug === "laptop-decals")?.id,
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop"],
      type: "sticker",
      tags: ["minimal", "nature"],
      stock: 200,
      isFeatured: false,
      rating: 4.5,
      reviewCount: 66,
    }
  ];

  // Generate additional products to reach 50
  for (let i = 6; i <= 50; i++) {
    const randomCollection = createdCollections[Math.floor(Math.random() * createdCollections.length)];
    const randomCategory = createdCategories[Math.floor(Math.random() * createdCategories.length)];
    const types = ["sticker", "sticker_vinyl", "poster", "spotify_card", "frame", "mystery_pack"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    productsData.push({
      name: `Awesome ${randomCollection.name} Design ${i}`,
      slug: `awesome-${randomCollection.slug}-design-${i}`,
      description: `High quality ${randomType} featuring ${randomCollection.name} aesthetics.`,
      priceCents: 9900 + Math.floor(Math.random() * 400) * 100, // 99 to 499
      compareAtCents: null,
      collectionId: randomCollection.id,
      categoryId: randomCategory.id,
      imageUrl: "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop",
      images: ["https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop"],
      type: randomType,
      tags: [randomCollection.slug, "new"],
      stock: Math.floor(Math.random() * 100),
      isFeatured: Math.random() > 0.8,
      rating: 4.0 + Math.random(),
      reviewCount: Math.floor(Math.random() * 200),
    });
  }

  let productsCreated = 0;
  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        currency: "INR",
        imageUrl: p.imageUrl,
        images: p.images,
        type: p.type,
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        tags: p.tags,
        stock: p.stock,
        isFeatured: p.isFeatured,
        rating: p.rating,
        reviewCount: p.reviewCount,
        metadata: { visibility: "visible" },
      },
    });
    productsCreated++;
  }
  console.log(`✅ Seeded ${productsCreated} products.`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
