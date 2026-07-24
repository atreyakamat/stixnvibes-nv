"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Music,
  Search,
  Sparkles,
  Check,
  ShoppingBag,
  Upload,
  Play,
  Pause,
  Heart,
  Sliders,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/cart-context";

export type CardMaterial = "acrylic_clear" | "neon_glow" | "wooden_base" | "metallic";
export type CardSize = "A5" | "A4" | "A3";

const MATERIAL_PRICE_CENTS: Record<CardMaterial, number> = {
  acrylic_clear: 999,
  neon_glow: 1499,
  wooden_base: 1299,
  metallic: 1799,
};

const SIZE_MULTIPLIER: Record<CardSize, number> = {
  A5: 1.0,
  A4: 1.4,
  A3: 2.0,
};

export function SpotifyCardEditor() {
  const { addItem } = useCart();

  // Spotify Track State
  const [spotifyUrl, setSpotifyUrl] = React.useState("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
  const [trackTitle, setTrackTitle] = React.useState("Starboy");
  const [artistName, setArtistName] = React.useState("The Weeknd, Daft Punk");
  const [coverUrl, setCoverUrl] = React.useState(
    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop"
  );
  const [customPhoto, setCustomPhoto] = React.useState<string | null>(null);

  // Custom Controls State
  const [material, setMaterial] = React.useState<CardMaterial>("neon_glow");
  const [cardSize, setCardSize] = React.useState<CardSize>("A4");
  const [timecode, setTimecode] = React.useState("01:23 / 03:50");
  const [customMessage, setCustomMessage] = React.useState("Happy Anniversary ❤️");
  const [quantity, setQuantity] = React.useState(1);

  // Status state
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [addedToast, setAddedToast] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);

  // Compute Price
  const baseCents = MATERIAL_PRICE_CENTS[material];
  const unitPriceCents = Math.round(baseCents * SIZE_MULTIPLIER[cardSize]);
  const totalPriceCents = unitPriceCents * quantity;

  // Fetch Track Metadata
  const fetchSpotifyTrack = async (urlInput: string) => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/spotify/metadata?url=${encodeURIComponent(urlInput)}`);
      const data = await res.json();

      if (data.ok && data.track) {
        setTrackTitle(data.track.title);
        setArtistName(data.track.artist);
        setCoverUrl(data.track.coverUrl);
      } else {
        setErrorMsg(data.error ?? "Failed to fetch Spotify track");
      }
    } catch {
      setErrorMsg("Network error fetching Spotify metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCustomPhoto(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddToCart = () => {
    addItem(
      {
        productId: "spotify_acrylic_card",
        variantId: `${cardSize}_${material}`,
        variantName: `${cardSize} • ${material.replace("_", " ").toUpperCase()}`,
        name: `Spotify Plaque (${trackTitle} - ${artistName})`,
        slug: "spotify-card",
        image: customPhoto ?? coverUrl,
        price_cents: unitPriceCents,
      },
      quantity
    );

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT: Live Spotify Glass Card Preview */}
      <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-yellow" />
            <h3 className="font-display font-bold text-lg text-white">Interactive Spotify Glass Preview</h3>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Scannable Wavecode
          </Badge>
        </div>

        {/* Realistic Acrylic Glass Card Container */}
        <div
          className={`relative mx-auto aspect-[3/4] w-full max-w-[340px] rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden border transition-all duration-500 ${
            material === "neon_glow"
              ? "bg-slate-950/90 border-brand-yellow/50 shadow-brand-yellow/20"
              : material === "wooden_base"
              ? "bg-amber-950/30 border-amber-800/40"
              : material === "metallic"
              ? "bg-slate-900/90 border-slate-600/50"
              : "bg-slate-950/70 border-slate-800"
          }`}
        >
          {/* Neon Edge Glow Effect */}
          {material === "neon_glow" && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-brand-yellow/15 via-brand-red/10 to-brand-purple/15 rounded-2xl" />
          )}

          {/* Album Cover Art */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={customPhoto ?? coverUrl}
              alt={trackTitle}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* Song Metadata */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <h4 className="font-display font-bold text-white text-lg truncate">{trackTitle}</h4>
                <p className="text-xs text-slate-300 truncate">{artistName}</p>
              </div>
              <Heart className="w-5 h-5 text-brand-red fill-brand-red shrink-0" />
            </div>

            {/* Spotify Scannable Soundwave SVG */}
            <div className="py-2 flex items-center justify-center opacity-90">
              <svg viewBox="0 0 200 30" className="w-full h-7 text-white fill-current">
                <rect x="5" y="8" width="4" height="14" rx="2" />
                <rect x="15" y="4" width="4" height="22" rx="2" />
                <rect x="25" y="10" width="4" height="10" rx="2" />
                <rect x="35" y="2" width="4" height="26" rx="2" />
                <rect x="45" y="12" width="4" height="6" rx="2" />
                <rect x="55" y="6" width="4" height="18" rx="2" />
                <rect x="65" y="14" width="4" height="8" rx="2" />
                <rect x="75" y="3" width="4" height="24" rx="2" />
                <rect x="85" y="10" width="4" height="10" rx="2" />
                <rect x="95" y="5" width="4" height="20" rx="2" />
                <rect x="105" y="15" width="4" height="6" rx="2" />
                <rect x="115" y="8" width="4" height="14" rx="2" />
                <rect x="125" y="2" width="4" height="26" rx="2" />
                <rect x="135" y="10" width="4" height="10" rx="2" />
                <rect x="145" y="6" width="4" height="18" rx="2" />
                <rect x="155" y="14" width="4" height="8" rx="2" />
                <rect x="165" y="4" width="4" height="22" rx="2" />
                <rect x="175" y="12" width="4" height="6" rx="2" />
                <rect x="185" y="8" width="4" height="14" rx="2" />
              </svg>
            </div>

            {/* Playback Progress Bar */}
            <div className="space-y-1">
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-yellow w-2/5 rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{timecode.split("/")[0]?.trim() || "01:23"}</span>
                <span>{timecode.split("/")[1]?.trim() || "03:50"}</span>
              </div>
            </div>

            {/* Personalized Inscription */}
            {customMessage && (
              <p className="text-center text-xs font-serif italic text-brand-yellow pt-1 truncate">
                "{customMessage}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Spotify Card Configurator Controls */}
      <div className="lg:col-span-6 space-y-6">
        {/* Spotify Track Input */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-semibold text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-brand-yellow" /> 1. Spotify Track Link or ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="Paste Spotify track URL..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm"
            />
            <Button
              variant="outline"
              onClick={() => fetchSpotifyTrack(spotifyUrl)}
              disabled={loading}
            >
              <Search className="w-4 h-4 mr-1" /> {loading ? "Fetching..." : "Fetch"}
            </Button>
          </div>
          {errorMsg && <p className="text-xs text-brand-red">{errorMsg}</p>}
        </div>

        {/* Custom Photo Override */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-yellow" /> 2. Override Album Cover (Optional)
          </label>
          <div className="relative border border-dashed border-slate-700 hover:border-brand-yellow rounded-xl p-4 text-center cursor-pointer bg-slate-950/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomPhotoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <p className="text-xs text-slate-300 font-medium">
              {customPhoto ? "Photo Attached (Click to Replace)" : "Upload Custom Couple/Friend Photo"}
            </p>
          </div>
        </div>

        {/* Custom Inscription & Timecode */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-yellow" /> 3. Personalized Inscription
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Custom Message / Date</span>
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="e.g. Happy Anniversary ❤️"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Timecode Display</span>
              <input
                type="text"
                value={timecode}
                onChange={(e) => setTimecode(e.target.value)}
                placeholder="01:23 / 03:50"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Material & Size Options */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-yellow" /> 4. Frame & Glass Material
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "neon_glow", label: "Neon Glow" },
                  { id: "acrylic_clear", label: "Clear Glass" },
                  { id: "wooden_base", label: "Wood Base" },
                  { id: "metallic", label: "Metallic" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMaterial(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    material === m.id
                      ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-yellow" /> 5. Size Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["A5", "A4", "A3"] as CardSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCardSize(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    cardSize === s
                      ? "border-brand-red bg-brand-red/10 text-brand-red"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {s} Frame
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white">
                ₹{(totalPriceCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">({quantity} unit)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center border border-slate-800 rounded-lg bg-slate-950">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm"
              >
                -
              </button>
              <span className="px-3 py-2 text-sm text-white font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm"
              >
                +
              </button>
            </div>

            <Button
              variant="gradient"
              size="lg"
              onClick={handleAddToCart}
              className="flex-1 sm:flex-initial"
            >
              {addedToast ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add Spotify Plaque
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
