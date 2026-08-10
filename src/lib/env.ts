// Environment variable validation at boot time
export function validateEnvironment() {
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

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === "production") {
      console.error(`❌ CRITICAL ERROR: Missing required environment variables in production: ${missing.join(", ")}`);
      // We do not throw immediately here for all to avoid breaking the entire build step,
      // but we log a critical error. The individual services will throw when used.
    } else {
      console.warn(`⚠️ Warning: Missing environment variables in development: ${missing.join(", ")}`);
    }
  }

  // Validate Token length
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_STATIC_ACCESS_TOKEN) {
    if (process.env.ADMIN_STATIC_ACCESS_TOKEN.length < 16) {
      console.error("❌ CRITICAL ERROR: ADMIN_STATIC_ACCESS_TOKEN is too weak. Must be at least 16 characters.");
    }
  }
}

// Run validation immediately when this file is imported
validateEnvironment();
