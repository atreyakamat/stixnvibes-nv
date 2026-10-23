import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product images are pre-sized WebP files or Supabase Storage URLs, served
  // with plain <img>; nothing goes through the image optimiser.
  images: { unoptimized: true },
  experimental: {
    // Admin product photos and custom-order artwork are uploaded through
    // server actions and route handlers.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
