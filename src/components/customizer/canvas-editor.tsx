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
  Undo2,
  Redo2,
  Download,
  Save,
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

interface CustomizerStateSnapshot {
  text: string;
  fontFamily: string;
  textColor: string;
  finish: StickerFinish;
  shape: StickerShape;
  size: StickerSize;
  scale: number;
  rotation: number;
  posX: number;
  posY: number;
}

const STORAGE_KEY = "snv_customizer_draft";

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
  const [saveToast, setSaveToast] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = React.useState<CustomizerStateSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const isUpdatingHistory = React.useRef(false);

  // Current state snapshot helper
  const getCurrentSnapshot = React.useCallback((): CustomizerStateSnapshot => ({
    text,
    fontFamily,
    textColor,
    finish,
    shape,
    size,
    scale,
    rotation,
    posX,
    posY,
  }), [text, fontFamily, textColor, finish, shape, size, scale, rotation, posX, posY]);

  // Push state to undo stack
  const pushHistory = React.useCallback((snapshot: CustomizerStateSnapshot) => {
    if (isUpdatingHistory.current) return;
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, snapshot].slice(-20); // Keep max 20 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // Auto-Save Draft to LocalStorage
  React.useEffect(() => {
    const draft = {
      imageSrc,
      text,
      fontFamily,
      textColor,
      finish,
      shape,
      size,
      scale,
      rotation,
      posX,
      posY,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage quota fallback
    }
  }, [imageSrc, text, fontFamily, textColor, finish, shape, size, scale, rotation, posX, posY]);

  // Auto-Restore Draft on Mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.imageSrc) setImageSrc(parsed.imageSrc);
        if (parsed.text) setText(parsed.text);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (parsed.textColor) setTextColor(parsed.textColor);
        if (parsed.finish) setFinish(parsed.finish);
        if (parsed.shape) setShape(parsed.shape);
        if (parsed.size) setSize(parsed.size);
        if (typeof parsed.scale === "number") setScale(parsed.scale);
        if (typeof parsed.rotation === "number") setRotation(parsed.rotation);
        if (typeof parsed.posX === "number") setPosX(parsed.posX);
        if (typeof parsed.posY === "number") setPosY(parsed.posY);
      }
    } catch {
      // Fallback
    }
  }, []);

  const handleUndo = React.useCallback(() => {
    if (historyIndex > 0) {
      isUpdatingHistory.current = true;
      const target = history[historyIndex - 1];
      setText(target.text);
      setFontFamily(target.fontFamily);
      setTextColor(target.textColor);
      setFinish(target.finish);
      setShape(target.shape);
      setSize(target.size);
      setScale(target.scale);
      setRotation(target.rotation);
      setPosX(target.posX);
      setPosY(target.posY);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => { isUpdatingHistory.current = false; }, 50);
    }
  }, [history, historyIndex]);

  const handleRedo = React.useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUpdatingHistory.current = true;
      const target = history[historyIndex + 1];
      setText(target.text);
      setFontFamily(target.fontFamily);
      setTextColor(target.textColor);
      setFinish(target.finish);
      setShape(target.shape);
      setSize(target.size);
      setScale(target.scale);
      setRotation(target.rotation);
      setPosX(target.posX);
      setPosY(target.posY);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => { isUpdatingHistory.current = false; }, 50);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Compute total price
  const sizeInches = Number(size.split("x")[0]) || 3;
  const currentDpi = imageMeta ? Math.round(imageMeta.width / sizeInches) : 300;
  const isLowDpi = imageSrc ? currentDpi < 150 : false;
  const basePriceCents = SIZE_BASE_PRICE_CENTS[size];
  const unitPriceCents = Math.round(basePriceCents * FINISH_PRICE_MULTIPLIER[finish]);
  const totalPriceCents = unitPriceCents * quantity;

  // Handle Image Upload with file validation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("Image size exceeds 10MB limit. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError("Failed to read image file.");
    };
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setUploadError("Failed to process image content.");
      };
      img.onload = () => {
        setImageMeta({ width: img.width, height: img.height });
        setImageSrc(src);
        pushHistory(getCurrentSnapshot());
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

    ctx.clearRect(0, 0, width, height);

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
      ctx.save();
      ctx.strokeStyle = "rgba(255, 178, 0, 0.4)";
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "14px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload Artwork to Preview", width / 2, height / 2);
      ctx.restore();
    }
  }, [imageSrc, posX, posY, rotation, scale, text, fontFamily, textColor, finish]);

  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Export 300 DPI High-Res Print File
  const exportHighDpiPng = () => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 1500;
    offscreen.height = 1500;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    // Draw high-dpi background & design
    ctx.fillStyle = finish === "holographic" ? "#141419" : "#000000";
    ctx.fillRect(0, 0, 1500, 1500);

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.translate(750 + posX * 3.75, 750 + posY * 3.75);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        const aspect = img.width / img.height;
        let drawW = 1050;
        let drawH = drawW / aspect;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        if (text.trim()) {
          ctx.save();
          ctx.font = `bold 96px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
          ctx.shadowBlur = 24;
          ctx.fillText(text, 750, 1380);
          ctx.restore();
        }

        const link = document.createElement("a");
        link.download = `snv-custom-sticker-300dpi-${Date.now()}.png`;
        link.href = offscreen.toDataURL("image/png");
        link.click();
      };
      img.src = imageSrc;
    }
  };

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
          <div className="flex items-center gap-2">
            {/* Undo / Redo buttons */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            {isLowDpi && (
              <Badge variant="accent" className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Low DPI ({currentDpi} DPI)
              </Badge>
            )}
          </div>
        </div>

        {/* Canvas Display */}
        <div className="relative aspect-square w-full max-w-[420px] mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full object-contain"
          />

          {/* Finish Effect Overlay */}
          {finish === "holographic" && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-brand-yellow/10 via-brand-red/10 to-brand-purple/10 mix-blend-overlay" />
          )}
          {finish === "clear" && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:12px_12px]" />
          )}
        </div>

        {/* Canvas Toolbar Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(2.5, s + 0.1))} className="border-slate-800">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="border-slate-800">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)} className="border-slate-800">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetTransforms} className="border-slate-800 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {imageSrc && (
              <Button variant="outline" size="sm" onClick={exportHighDpiPng} className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> 300 DPI Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Customization Controls & Specifications */}
      <div className="lg:col-span-6 space-y-6">
        {/* Upload Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <h4 className="font-display font-bold text-white mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-yellow" /> 1. Upload Artwork
          </h4>

          <label className="border-2 border-dashed border-slate-800 hover:border-brand-yellow/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer text-center group bg-slate-950/40">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-brand-yellow transition-colors mb-2" />
            <span className="text-sm font-semibold text-white">Click or Drag Image Here</span>
            <span className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP, SVG up to 10MB</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleImageUpload} className="hidden" />
          </label>

          {uploadError && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {uploadError}
            </p>
          )}
        </div>

        {/* Text Overlay Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h4 className="font-display font-bold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-yellow" /> 2. Text Overlay
          </h4>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Custom Caption</label>
            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                pushHistory(getCurrentSnapshot());
              }}
              maxLength={40}
              placeholder="e.g. STIX N VIBES"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand-yellow text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Typography</label>
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  pushHistory(getCurrentSnapshot());
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-yellow text-xs"
              >
                {FONTS.map((f) => (
                  <option key={f.name} value={f.family}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    pushHistory(getCurrentSnapshot());
                  }}
                  className="w-9 h-9 bg-transparent border-0 rounded cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-400 uppercase">{textColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications: Finish & Size */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Vinyl Finish</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["matte", "glossy", "holographic", "clear"] as StickerFinish[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFinish(f);
                    pushHistory(getCurrentSnapshot());
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all ${
                    finish === f
                      ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow shadow-lg shadow-brand-yellow/10"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Dimensions</label>
            <div className="grid grid-cols-4 gap-2">
              {(["2x2", "3x3", "4x4", "5x5"] as StickerSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSize(s);
                    pushHistory(getCurrentSnapshot());
                  }}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    size === s
                      ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {s} in
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add to Cart Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Unit Price</p>
            <p className="font-display font-bold text-2xl text-white">₹{(totalPriceCents / 100).toFixed(0)}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="text-slate-400 hover:text-white text-lg px-1">-</button>
              <span className="px-3 font-semibold text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="text-slate-400 hover:text-white text-lg px-1">+</button>
            </div>

            <Button variant="gradient" size="lg" onClick={handleAddToCart} className="flex-1 sm:flex-initial rounded-xl">
              <ShoppingBag className="w-4 h-4 mr-2" /> Add Custom Sticker
            </Button>
          </div>
        </div>

        {addedToast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Added to your cart successfully!
          </motion.div>
        )}
      </div>
    </div>
  );
}
