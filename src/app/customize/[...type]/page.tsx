import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StickerBuilderPage from "../sticker-builder/page";
import SpotifyCardPage from "../spotify-card/page";
import CustomizeHubPage from "../page";

interface PageProps {
  params: { type: string[] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const customType = params.type?.[0] ?? "studio";
  const title = customType.charAt(0).toUpperCase() + customType.slice(1);
  return {
    title: `Custom ${title} Studio — Stix N Vibes`,
    description: `Design custom ${customType} with real-time 300 DPI vector rendering and instant live preview.`,
  };
}

export default function CustomizeCatchAllPage({ params }: PageProps) {
  const typeSegments = params.type ?? [];
  const primaryType = typeSegments[0]?.toLowerCase() ?? "";

  if (primaryType.includes("spotify") || primaryType.includes("music") || primaryType.includes("plaque")) {
    return <SpotifyCardPage />;
  }

  // Default to vinyl sticker studio for stickers, posters, frames, or general custom requests
  return <StickerBuilderPage />;
}
