require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requiredTables = [
  'products', 'variants', 'collections', 'categories', 'materials', 'sizes', 
  'orders', 'order_items', 'inventory_logs', 'print_batches', 'production_jobs',
  'quality_checks', 'shipments', 'shipment_events', 'media', 'settings',
  'admin_users'
];

async function run() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const tables = res.map(r => r.table_name);
    
    const missing = requiredTables.filter(t => !tables.includes(t));
    
    if (missing.length > 0) {
      console.error("❌ MISSING REQUIRED TABLES:");
      missing.forEach(m => console.error("  - " + m));
      process.exit(1);
    }
    
    console.log("✅ Database schema validated. All required tables are present.");
  } catch (e) {
    console.error("❌ Database connection or query failed:", e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
