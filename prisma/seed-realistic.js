import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding massive realistic dataset...");
  
  // 1. Materials
  const materials = ["Premium Vinyl", "Holographic", "Transparent", "Gloss Paper", "Matte Paper"];
  for (const m of materials) {
    await prisma.material.upsert({
      where: { slug: m.toLowerCase().replace(" ", "-") },
      update: {},
      create: { name: m, slug: m.toLowerCase().replace(" ", "-") }
    });
  }

  // 2. Sizes
  const sizes = ["3x3", "4x4", "5x5", "A4", "A5"];
  for (const s of sizes) {
    await prisma.size.upsert({
      where: { slug: s.toLowerCase() },
      update: {},
      create: { name: s, slug: s.toLowerCase() }
    });
  }

  // 3. Customers
  const customer = await prisma.users.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: { email: "customer@example.com", full_name: "Real Customer", id: "11111111-1111-1111-1111-111111111111" }
  });

  console.log("Seeding completed");
}
main().catch(console.error);
