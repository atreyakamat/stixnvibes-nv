"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Type,
  AlertTriangle,
  Check,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Layers,
  Palette,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/cart-context";

export type StickerFinish = "glossy" | "matte" | "holographic" | "clear";
export type StickerShape = "die-cut" | "circle" | "square" | "badge";
export type StickerSize = "2x2" | "3x3" | "4x4" | "5x5";

const FINISH_PRICE_MULTIPLIER: Record<StickerFinish, number> = {
  matte: 1.0,
  glossy: 1.1,
  holographic: 1.35,
  clear: 1.2,
};

const SIZE_BASE_PRICE_CENTS: Record<StickerSize, number> = {
  "2x2": 199,
  "3x3": 299,
  "4x4": 399,
  "5x5": 549,
};

const FONTS = [
  { name: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
  { name: "Inter", family: "'Inter', sans-serif" },
  { name: "Impact", family: "Impact, sans-serif" },
  { name: "Courier New", family: "'Courier New', monospace" },
];

export function CanvasEditor() {
  const { addItem } = useCart();

  // Canvas State
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [imageMeta, setImageMeta] = React.useState<{ width: number; height: number } | null>(null);
  const [text, setText] = React.useState("NEON VIBES");
  const [fontFamily, setFontFamily] = React.useState(FONTS[0].family);
  const [textColor, setTextColor] = React.useState("#FFB200");
  const [finish, setFinish] = React.useState<StickerFinish>("holographic");
  const [shape, setShape] = React.useState<StickerShape>("die-cut");
  const [size, setSize] = React.useState<StickerSize>("3x3");
  const [quantity, setQuantity] = React.useState(1);

  // Transform controls
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [posX, setPosX] = React.useState(0);
  const [posY, setPosY] = React.useState(0);

  // UI state
  const [addedToast, setAddedToast] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Calculate DPI resolution check
  const sizeInches = Number(size.split("x")[0]) || 3;
  const currentDpi = imageMeta ? Math.round(imageMeta.width / sizeInches) : 300;
  const isLowDpi = imageSrc ? currentDpi < 150 : false;

  // Compute total price
  const basePriceCents = SIZE_BASE_PRICE_CENTS[size];
  const unitPriceCents = Math.round(basePriceCents * FINISH_PRICE_MULTIPLIER[finish]);
  const totalPriceCents = unitPriceCents * quantity;

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImageMeta({ width: img.width, height: img.height });
        setImageSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Render Canvas
  const drawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Draw background placeholder / finish pattern
    ctx.save();
    ctx.fillStyle = "#141419";
    ctx.fillRect(0, 0, width, height);

    if (finish === "holographic") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "rgba(255, 178, 0, 0.15)");
      grad.addColorStop(0.5, "rgba(229, 38, 31, 0.15)");
      grad.addColorStop(1, "rgba(156, 77, 214, 0.15)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    // Draw user image if available
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.translate(width / 2 + posX, height / 2 + posY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        const aspect = img.width / img.height;
        let drawW = width * 0.7;
        let drawH = drawW / aspect;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Draw overlay text
        if (text.trim()) {
          ctx.save();
          ctx.font = `bold 28px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 8;
          ctx.fillText(text, width / 2, height - 36);
          ctx.restore();
        }
      };
      img.src = imageSrc;
    } else {
      // Draw placeholder guide
      ctx.save();
      ctx.strokeStyle = "rgba(255, 178, 0, 0.4)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      ctx.fillStyle = "#A1A1AA";
      ctx.font = "16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload Artwork to Preview", width / 2, height / 2);
      ctx.restore();

      // Draw overlay text even without image
      if (text.trim()) {
        ctx.save();
        ctx.font = `bold 28px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.fillText(text, width / 2, height - 36);
        ctx.restore();
      }
    }
  }, [imageSrc, posX, posY, rotation, scale, text, fontFamily, textColor, finish]);

  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Add Custom Sticker to Cart
  const handleAddToCart = () => {
    const canvas = canvasRef.current;
    const previewUrl = canvas ? canvas.toDataURL("image/png") : undefined;

    addItem(
      {
        productId: "custom_sticker_studio",
        variantId: `${size}_${finish}_${shape}`,
        variantName: `${size.toUpperCase()} • ${finish.toUpperCase()} • ${shape.toUpperCase()}`,
        name: `Custom Vinyl Sticker (${text || "Custom Design"})`,
        slug: "custom-sticker-studio",
        image: previewUrl ?? imageSrc ?? "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=800&auto=format&fit=crop",
        price_cents: unitPriceCents,
      },
      quantity
    );

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const resetTransforms = () => {
    setScale(1);
    setRotation(0);
    setPosX(0);
    setPosY(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT: Live Interactive Canvas Column */}
      <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-yellow" />
            <h3 className="font-display font-bold text-lg text-white">Live 2D Canvas Studio</h3>
          </div>
          {isLowDpi && (
            <Badge variant="accent" className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low DPI ({currentDpi} DPI)
            </Badge>
          )}
        </div>

        {/* Canvas Display */}
        <div className="relative aspect-square w-full max-w-[420px] mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full object-contain"
          />

          {/* Finish overlay sheen effect */}
          {finish === "holographic" && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-brand-yellow/10 via-brand-red/10 to-brand-purple/10 opacity-75 mix-blend-overlay" />
          )}
          {finish === "glossy" && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/15 via-transparent to-black/20" />
          )}
        </div>

        {/* Transform Toolbar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 mr-1" /> Scale +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 mr-1" /> Scale -
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4 mr-1" /> Rotate
          </Button>
          <Button variant="ghost" size="sm" onClick={resetTransforms} title="Reset">
            <RefreshCw className="w-4 h-4 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* RIGHT: Customizer Configuration Controls */}
      <div className="lg:col-span-6 space-y-6">
        {/* Upload Dropzone */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-yellow" /> 1. Upload Custom Image / Artwork
          </label>
          <div className="relative border-2 border-dashed border-slate-700 hover:border-brand-yellow rounded-xl p-6 text-center transition-colors cursor-pointer bg-slate-950/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-white">
              {imageSrc ? "Click to Replace Image" : "Drop PNG, JPG or SVG here"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Recommended 300 DPI for ultra-sharp vinyl print</p>
          </div>
        </div>

        {/* Text Layer Editor */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-semibold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-yellow" /> 2. Custom Text Overlay
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter custom slogan or text..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Typography Font</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs"
              >
                {FONTS.map((f) => (
                  <option key={f.name} value={f.family}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Text Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="text-xs text-slate-300 font-mono">{textColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Material Finish & Size Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-yellow" /> 3. Material Finish
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["holographic", "glossy", "matte", "clear"] as StickerFinish[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFinish(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    finish === f
                      ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow shadow-lg shadow-brand-yellow/10"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-brand-yellow" /> 4. Sticker Dimensions
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["2x2", "3x3", "4x4", "5x5"] as StickerSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    size === s
                      ? "border-brand-red bg-brand-red/10 text-brand-red"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {s.replace("x", '" x ')}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price & Add to Cart Action Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Estimated Total</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white">
                ₹{(totalPriceCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-normal">({quantity} unit)</span>
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
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add Custom Sticker
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
