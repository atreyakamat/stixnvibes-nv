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
      throw new Error("ADMIN_STATIC_ACCESS_TOKEN is too weak");
    }
  }

  // Enforce Production Environmental Hygiene (FAIL FAST)
  if (process.env.NODE_ENV === "production") {
    const dbUrl = process.env.DATABASE_URL || "";
    const directUrl = process.env.DIRECT_URL || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("stixnvibes_test")) {
      throw new Error("CRITICAL SECURITY: Production DATABASE_URL cannot point to localhost or test database.");
    }
    
    if (directUrl.includes("localhost") || directUrl.includes("127.0.0.1") || directUrl.includes("stixnvibes_test")) {
      throw new Error("CRITICAL SECURITY: Production DIRECT_URL cannot point to localhost or test database.");
    }

    if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
      throw new Error("CRITICAL SECURITY: Production NEXT_PUBLIC_SUPABASE_URL cannot point to localhost.");
    }

    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
    if (cloudinaryCloudName.includes("mock") || cloudinaryCloudName === "your-cloud-name") {
      throw new Error("CRITICAL SECURITY: Production Cloudinary configuration cannot use mock values.");
    }

    const rzpKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (rzpKeyId.includes("mock") || rzpKeyId === "mock_rzp_key" || rzpKeyId === "test") {
      throw new Error("CRITICAL SECURITY: Production Razorpay configuration cannot use mock values.");
    }
  }
}

// Run validation immediately when this file is imported
validateEnvironment();
