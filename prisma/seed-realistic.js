import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding massive realistic dataset...");
  
  // 1. Materials
  const materials = ["Premium Vinyl", "Holographic", "Transparent", "Gloss Paper", "Matte Paper"];
  for (const m of materials) {
    const slug = m.toLowerCase().replace(" ", "-");
    const existing = await prisma.material.findFirst({ where: { slug } });
    if (!existing) {
      await prisma.material.create({ data: { name: m, slug: slug } });
    }
  }

  // 2. Sizes
  const sizes = ["3x3", "4x4", "5x5", "A4", "A5"];
  for (const s of sizes) {
    const slug = s.toLowerCase();
    const existing = await prisma.size.findFirst({ where: { slug } });
    if (!existing) {
      await prisma.size.create({ data: { name: s, slug: slug } });
    }
  }

  // 3. Customers
  const customerId = "11111111-1111-1111-1111-111111111111";
  let customer = await prisma.users.findUnique({ where: { id: customerId } });
  if (!customer) {
    customer = await prisma.users.create({
      data: { id: customerId, email: "customer@example.com" }
    });
  }

  // 4. Products (Create one robust product for orders)
  const productId = "44444444-4444-4444-4444-444444444444";
  let product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        id: productId,
        name: "Test Realistic Product",
        slug: "test-realistic-product",
        priceCents: 15000,
        stock: 100,
        currency: "INR",
        metadata: { visibility: "visible" }
      }
    });
  }

  // 5. Orders
  await prisma.order.create({
    data: {
      customerName: "Real Customer",
      customerPhone: "1234567890",
      customerEmail: "customer@example.com",
      address: "123 Test St",
      pincode: "110001",
      totalCents: 45000,
      status: "paid",
      user_id: customer.id,
      items: {
        create: [
          { priceCents: 45000, quantity: 1, productId: product.id }
        ]
      }
    }
  }).catch(e => console.log("Order already exists or product missing"));

  console.log("Seeding completed");
}
main().catch(console.error);
