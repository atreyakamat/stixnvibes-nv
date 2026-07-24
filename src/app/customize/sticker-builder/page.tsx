import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Sticker } from "lucide-react";
import { Container } from "@/components/layout/container";
import { CanvasEditor } from "@/components/customizer/canvas-editor";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Custom Vinyl Sticker Studio | Stix N Vibes",
  description: "Design custom holographic vinyl stickers with live 2D canvas, DPI checks, custom fonts, and instant preview.",
};

export default function StickerBuilderPage() {
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
            <span className="text-xs font-mono text-brand-yellow bg-brand-yellow/10 border border-brand-yellow/20 px-3 py-1 rounded-full">
              Canvas Studio v2.4 • 300 DPI Engine
            </span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Sticker className="w-8 h-8 text-brand-yellow" /> Custom Vinyl Sticker Studio
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload your image, adjust transforms, customize typography, and select holographic finishes.
            </p>
          </div>
        </Reveal>

        {/* Live Canvas Editor Component */}
        <CanvasEditor />
      </Container>
    </div>
  );
}
