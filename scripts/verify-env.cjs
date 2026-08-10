require('dotenv').config();

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_STATIC_ACCESS_TOKEN",
];

const missing = required.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error("❌ MISSING REQUIRED ENVIRONMENT VARIABLES:");
  missing.forEach(m => console.error("  - " + m));
  process.exit(1);
}

const token = process.env.ADMIN_STATIC_ACCESS_TOKEN;
if (token && token.length < 16) {
  console.error("❌ ADMIN_STATIC_ACCESS_TOKEN is too weak. Must be at least 16 characters.");
  process.exit(1);
}

console.log("✅ All required environment variables are present.");
