const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.product.count();
  console.log('Products count:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
