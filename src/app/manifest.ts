import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stix N Vibes",
    short_name: "StixNvibes",
    description: "Premium stickers, posters, Spotify cards, frames and mystery packs.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#FFB200",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
