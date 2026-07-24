import * as React from "react";
import Link from "next/link";
import { Sparkles, Music, Sticker, ArrowRight, ShieldCheck, Zap, Palette } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";

export const metadata = {
  title: "Live Customizer Studio | Stix N Vibes",
  description: "Design custom holographic vinyl stickers and scannable Spotify acrylic plaques with real-time 2D/3D preview.",
};

const STUDIO_CARDS = [
  {
    id: "sticker-builder",
    title: "Custom Vinyl Sticker Studio",
    kicker: "FLAGSHIP CANVAS",
    description:
      "Upload artwork or photo, add typography, select die-cut shapes, and apply holographic or matte finishes in 300 DPI high resolution.",
    icon: Sticker,
    href: "/customize/sticker-builder",
    badge: "300 DPI Vector",
    color: "from-brand-yellow/20 to-brand-red/20",
    border: "hover:border-brand-yellow",
  },
  {
    id: "spotify-card",
    title: "Spotify Acrylic Plaque Builder",
    kicker: "SCANNABLE SOUNDWAVE",
    description:
      "Paste any Spotify song URL to auto-generate scannable barcode soundwaves on clear acrylic glass with neon edge glow options.",
    icon: Music,
    href: "/customize/spotify-card",
    badge: "Live Audio Code",
    color: "from-emerald-500/20 to-brand-purple/20",
    border: "hover:border-emerald-500",
  },
];

export default function CustomizeHubPage() {
  return (
    <div className="bg-slate-950 text-white min-h-screen py-12">
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="brand" className="px-4 py-1 text-sm font-semibold uppercase tracking-widest">
              Interactive Customization Engine
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              Create Unique Custom <span className="bg-gradient-to-r from-brand-yellow via-brand-red to-brand-purple bg-clip-text text-transparent">Vibes</span>
            </h1>
            <p className="text-slate-400 text-lg sm:text-xl">
              Turn your artwork, favorite songs, and memories into premium physical merchandise with instant live preview.
            </p>
          </div>
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {STUDIO_CARDS.map((studio) => {
            const Icon = studio.icon;
            return (
              <StaggerItem key={studio.id}>
                <div
                  className={`group relative bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl transition-all duration-300 ${studio.border} hover:shadow-2xl overflow-hidden flex flex-col justify-between h-full`}
                >
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${studio.color} rounded-full blur-3xl -z-10 group-hover:scale-125 transition-transform duration-500`} />

                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-yellow group-hover:scale-110 transition-transform">
                        <Icon className="w-7 h-7" />
                      </div>
                      <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                        {studio.badge}
                      </Badge>
                    </div>

                    <span className="text-xs font-bold text-brand-yellow tracking-widest uppercase block mb-1">
                      {studio.kicker}
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
                      {studio.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      {studio.description}
                    </p>
                  </div>

                  <div>
                    <Link href={studio.href}>
                      <Button variant="gradient" size="xl" className="w-full group">
                        Launch Studio <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        {/* Feature Highlights */}
        <Reveal variant="scale">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 sm:p-12">
            <SectionHeader
              kicker="STUDIO GUARANTEE"
              title="Enterprise Print Precision"
              description="Every custom order is inspected by our print engineers before production."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-brand-yellow mx-auto" />
                <h3 className="font-display font-bold text-white text-base">Weatherproof Vinyl</h3>
                <p className="text-xs text-slate-400">UV resistant, 100% waterproof, scratch proof coating.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <Zap className="w-8 h-8 text-brand-red mx-auto" />
                <h3 className="font-display font-bold text-white text-base">300 DPI Vector Output</h3>
                <p className="text-xs text-slate-400">Crisp edge accuracy for die-cut precision shapes.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <Palette className="w-8 h-8 text-brand-purple mx-auto" />
                <h3 className="font-display font-bold text-white text-base">Holographic & Neon</h3>
                <p className="text-xs text-slate-400">Iridescent rainbow foil and ambient edge glow acrylics.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </div>
  );
}
