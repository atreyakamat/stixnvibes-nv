import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Music } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SpotifyCardEditor } from "@/components/customizer/spotify-card-editor";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Spotify Acrylic Plaque Builder | Stix N Vibes",
  description: "Create personalized Spotify acrylic plaques with scannable soundwave barcodes, ambient neon glow, and custom timecodes.",
};

export default function SpotifyCardPage() {
  return (
    <div className="bg-slate-950 text-white min-h-screen py-8">
      <Container>
        <Reveal>
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/customize"
              className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-brand-yellow transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Customizer Hub
            </Link>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Spotify API v2 • Live Wavecode Engine
            </span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Music className="w-8 h-8 text-brand-yellow" /> Spotify Acrylic Plaque Builder
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Paste a Spotify track link to automatically generate scannable soundwave barcodes on premium acrylic glass.
            </p>
          </div>
        </Reveal>

        {/* Live Spotify Card Editor Component */}
        <SpotifyCardEditor />
      </Container>
    </div>
  );
}
