import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product images are pre-sized WebP files or Supabase Storage URLs, served
  // with plain <img>; nothing goes through the image optimiser.
  images: { unoptimized: true },
  // Netlify only passes netlify.toml context variables to the build, not to
  // the server functions. Inlining the flag at build time makes deploy
  // previews run in demo mode at runtime too.
  env: { SHOP_DEMO_MODE: process.env.SHOP_DEMO_MODE ?? "" },
  experimental: {
    // Admin product photos are uploaded through server actions.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
