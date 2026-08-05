/**
 * Script to wipe seed products from local/Supabase PostgreSQL database.
 * Allows the owner to add all products, images, and collections fresh from the Admin Panel.
 *
 * Usage: node scripts/clear-db-products.cjs
 */

const http = require("http");

async function main() {
  console.log("To clear products from PostgreSQL, run the following SQL command in Supabase SQL Editor:\n");
  console.log("TRUNCATE TABLE public.order_items, public.production_jobs, public.quality_checks, public.shipments, public.orders, public.variants, public.products CASCADE;\n");
  console.log("This will clear seed products and leave a clean database for admin entry.");
}

main().catch(console.error);
