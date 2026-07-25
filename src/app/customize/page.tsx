import type { Metadata } from "next";
import { CustomizeView } from "@/components/customizer/customize-view";

export const metadata: Metadata = {
  title: "Customize — Stix N Vibes",
  description: "Create custom Spotify cards, posters, frames & stickers. Live preview, instant edits, ship across India.",
  alternates: { canonical: "/customize" },
  openGraph: {
    title: "Customize — Stix N Vibes",
    description: "Design your own premium stickers, posters, Spotify cards & frames with live preview.",
    url: "/customize",
  },
};

export default function CustomizePage() {
  return <CustomizeView />;
}