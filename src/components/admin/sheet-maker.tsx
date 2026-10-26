"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SPEC, layoutSheets, perSheet, PRINT_THEN_CUT_MAX, specProblem, withDpi, type Sheet, type SheetSpec } from "@/lib/sheet-layout";

export type SheetDesign = { name: string; src: string; qty: number };
type Design = SheetDesign & { key: string; img: HTMLImageElement | null; error?: string };

const CM = 2.54;

/** Same-origin URL a canvas may export: our own files load directly, the rest through the admin image relay. */
function loadable(src: string) {
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;
  if (src.startsWith("/") && !src.startsWith("/u/")) return src;
  return `/api/admin/image?src=${encodeURIComponent(src)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load this design."));
    img.src = loadable(src);
  });
}

/** Clears near-white pixels connected to the edge (a JPG's paper background). */
function removeWhiteBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const white = (i: number) => d[i * 4 + 3] > 0 && d[i * 4] > 235 && d[i * 4 + 1] > 235 && d[i * 4 + 2] > 235;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !white(i)) continue;
    seen[i] = 1;
    d[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  ctx.putImageData(data, 0, 0);
}

/**
 * One sticker, ready to place: the design at w×h on a solid white border
 * b px wide that follows its shape. The border's edge is where the Cricut
 * cuts, so it's made fully opaque (no soft edge to confuse the cut line).
 */
function prepare(img: HTMLImageElement, w: number, h: number, b: number, clearWhite: boolean): HTMLCanvasElement {
  const art = document.createElement("canvas");
  art.width = w;
  art.height = h;
  const a = art.getContext("2d")!;
  a.imageSmoothingQuality = "high";
  a.drawImage(img, 0, 0, w, h);
  if (clearWhite) removeWhiteBackground(a, w, h);

  const out = document.createElement("canvas");
  out.width = w + 2 * b;
  out.height = h + 2 * b;
  const o = out.getContext("2d")!;
  if (b > 0) {
    const sil = document.createElement("canvas");
    sil.width = w;
    sil.height = h;
    const s = sil.getContext("2d")!;
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = "#fff";
    s.fillRect(0, 0, w, h);
    o.drawImage(sil, b, b);
    for (const r of [b / 2, b])
      for (let k = 0; k < 36; k++) {
        const t = (k / 36) * Math.PI * 2;
        o.drawImage(sil, b + r * Math.cos(t), b + r * Math.sin(t));
      }
    const px = o.getImageData(0, 0, out.width, out.height);
    for (let i = 3; i < px.data.length; i += 4) px.data[i] = px.data[i] > 60 ? 255 : 0;
    o.putImageData(px, 0, 0);
  }
  o.drawImage(art, b, b);
  return out;
}

function drawSheet(canvas: HTMLCanvasElement, sheet: Sheet, stickers: Map<string, HTMLCanvasElement>, b: number) {
  canvas.width = sheet.widthPx;
  canvas.height = sheet.heightPx;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of sheet.placements) {
    const s = stickers.get(p.key);
    if (s) ctx.drawImage(s, p.x - b, p.y - b);
  }
}

export function SheetMaker({ products, initial, title }: { products: { id: string; name: string; image: string }[]; initial: SheetDesign[]; title: string }) {
  const [designs, setDesigns] = useState<Design[]>(() => initial.map((d, i) => ({ ...d, key: `init-${i}`, img: null })));
  const [sizeCm, setSizeCm] = useState("5");
  const [borderMm, setBorderMm] = useState("1.5");
  const [gapMm, setGapMm] = useState("4");
  const [sheetW, setSheetW] = useState(String(PRINT_THEN_CUT_MAX.widthIn));
  const [sheetH, setSheetH] = useState(String(PRINT_THEN_CUT_MAX.heightIn));
  const [clearWhite, setClearWhite] = useState(false);
  const [query, setQuery] = useState("");
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  const spec: SheetSpec = {
    ...DEFAULT_SPEC,
    widthIn: Number(sheetW) || 0,
    heightIn: Number(sheetH) || 0,
    sizeIn: (Number(sizeCm) || 0) / CM,
    borderIn: (Number(borderMm) || 0) / 10 / CM,
    gapIn: (Number(gapMm) || 0) / 10 / CM,
  };
  const problem = specProblem(spec);

  // Load each design once.
  useEffect(() => {
    for (const d of designs) {
      if (d.img || d.error) continue;
      loadImage(d.src).then(
        (img) => setDesigns((list) => list.map((x) => (x.key === d.key ? { ...x, img } : x))),
        (err: Error) => setDesigns((list) => list.map((x) => (x.key === d.key ? { ...x, error: err.message } : x))),
      );
    }
  }, [designs]);

  const ready = designs.filter((d) => d.img && d.qty > 0);
  const readyKey = ready.map((d) => `${d.key}:${d.qty}`).join(",");
  const sheets = useMemo(() => {
    if (problem) return [];
    try {
      return layoutSheets(
        ready.map((d) => ({ key: d.key, aspect: d.img!.naturalWidth / d.img!.naturalHeight, qty: d.qty })),
        spec,
      );
    } catch {
      return [];
    }
    // spec is rebuilt every render; its inputs are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyKey, sizeCm, borderMm, gapMm, sheetW, sheetH, problem]);

  // Draw full-size sheets (they're also what gets downloaded).
  useEffect(() => {
    if (!sheets.length) return;
    const b = Math.round(spec.borderIn * spec.dpi);
    const stickers = new Map<string, HTMLCanvasElement>();
    for (const d of ready) {
      const p = sheets.flatMap((s) => s.placements).find((x) => x.key === d.key);
      if (p) stickers.set(d.key, prepare(d.img!, p.w, p.h, b, clearWhite));
    }
    sheets.forEach((s, i) => canvases.current[i] && drawSheet(canvases.current[i]!, s, stickers, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets, clearWhite]);

  const [dragging, setDragging] = useState(false);
  const addFiles = (files: Iterable<File>) =>
    add(
      [...files]
        .filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type))
        .map((f) => ({ name: f.name.replace(/\.[^.]+$/, ""), src: URL.createObjectURL(f), qty: 1 })),
    );
  const add = (list: SheetDesign[]) => setDesigns((d) => [...d, ...list.map((x) => ({ ...x, key: crypto.randomUUID(), img: null }))]);
  const update = (key: string, patch: Partial<Design>) => setDesigns((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function download(i: number) {
    const canvas = canvases.current[i];
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const png = withDpi(new Uint8Array(await blob.arrayBuffer()), spec.dpi);
    const url = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-sheet-${i + 1}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const matches = query.trim() ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12) : [];
  const total = sheets.reduce((n, s) => n + s.placements.length, 0);
  const lbl = "mb-1 block text-xs text-paper/60";

  return (
    <div className="grid gap-8 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-6">
        <section
          className={`space-y-3 rounded-2xl border p-5 ${dragging ? "border-lemon bg-lemon/5" : "border-line"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <h2 className="font-medium">Designs</h2>
          {designs.length === 0 && <p className="text-sm text-mute">Drop PNG or JPG files here, add them from your computer, or pick products from the shop.</p>}
          <ul className="space-y-2">
            {designs.map((d) => (
              <li key={d.key} className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper/5 p-1">
                  {d.img && <img src={d.img.src} alt="" className="max-h-full w-auto object-contain" />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate">{d.name}</p>
                  {d.error ? (
                    <p className="text-xs text-[#ff7a59]">{d.error}</p>
                  ) : !d.img ? (
                    <p className="text-xs text-mute">Loading…</p>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-mute underline underline-offset-2 hover:text-lemon"
                      onClick={() => update(d.key, { qty: perSheet(d.img!.naturalWidth / d.img!.naturalHeight, spec) || d.qty })}
                    >
                      Fill a sheet
                    </button>
                  )}
                </div>
                <label className="sr-only" htmlFor={`qty-${d.key}`}>
                  How many of {d.name}
                </label>
                <input
                  id={`qty-${d.key}`}
                  value={d.qty}
                  onChange={(e) => update(d.key, { qty: Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                  inputMode="numeric"
                  className="field w-16 !py-1.5 text-center text-sm tabular-nums"
                />
                <button type="button" aria-label={`Remove ${d.name}`} className="text-mute hover:text-[#ff7a59]" onClick={() => setDesigns((l) => l.filter((x) => x.key !== d.key))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-line pt-3">
            <label className="block">
              <span className={lbl}>Add a product</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs, e.g. lo-fi" className="field !py-2 text-sm" />
            </label>
            {matches.length > 0 && (
              <ul className="max-h-56 overflow-y-auto rounded-xl border border-line text-sm">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-paper/5" onClick={() => add([{ name: p.name, src: p.image, qty: 1 }])}>
                      <img src={p.image} alt="" className="size-8 rounded object-contain" />
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="btn btn-ghost w-full cursor-pointer justify-center !py-2 text-sm">
              Add files from this computer
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addFiles(e.target.files ?? []);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-xs text-mute">Files from your computer stay on it; nothing is uploaded.</p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-line p-5">
          <h2 className="font-medium">Sizes</h2>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={lbl}>Sticker (cm, long side)</span>
              <input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} inputMode="decimal" className="field !py-2 text-sm tabular-nums" />
            </label>
            <label className="block">
              <span className={lbl}>White border (mm)</span>
              <input value={borderMm} onChange={(e) => setBorderMm(e.target.value)} inputMode="decimal" className="field !py-2 text-sm tabular-nums" />
            </label>
            <label className="block">
              <span className={lbl}>Gap (mm)</span>
              <input value={gapMm} onChange={(e) => setGapMm(e.target.value)} inputMode="decimal" className="field !py-2 text-sm tabular-nums" />
            </label>
            <label className="block">
              <span className={lbl}>Sheet width (in)</span>
              <input value={sheetW} onChange={(e) => setSheetW(e.target.value)} inputMode="decimal" className="field !py-2 text-sm tabular-nums" />
            </label>
            <label className="block">
              <span className={lbl}>Sheet height (in)</span>
              <input value={sheetH} onChange={(e) => setSheetH(e.target.value)} inputMode="decimal" className="field !py-2 text-sm tabular-nums" />
            </label>
          </div>
          <p className="text-xs text-mute">6.75 × 9.25 in is the biggest Print Then Cut area on A4. Keep the gap at 3 mm or more so the blade has room.</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={clearWhite} onChange={(e) => setClearWhite(e.target.checked)} className="mt-0.5 size-4 accent-lemon" />
            <span>
              Remove white backgrounds
              <span className="block text-xs text-mute">For JPGs on white: the cut then follows the design instead of a square.</span>
            </span>
          </label>
          {problem && (
            <p className="text-sm text-[#ff7a59]" role="alert">
              {problem}
            </p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-line p-5 text-sm text-paper/80">
          <h2 className="font-medium text-paper">In Cricut Design Space</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Upload → Upload image → pick the downloaded sheet PNG.</li>
            <li>Choose Complex, keep the background as it is (already transparent), then save it as a Print Then Cut image.</li>
            <li>
              Add it to the canvas and set its width to <strong>{sheetW} in</strong> with the lock on, so stickers print at {sizeCm} cm.
            </li>
            <li>Make It → print with bleed on → load the sheet → cut.</li>
          </ol>
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute" data-testid="sheet-summary">
            {total} sticker{total === 1 ? "" : "s"} on {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
          </p>
          {sheets.length > 1 && (
            <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => sheets.forEach((_, i) => setTimeout(() => void download(i), i * 400))}>
              Download all
            </button>
          )}
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {sheets.map((s, i) => (
            <li key={i} className="space-y-2">
              <div className="rounded-xl bg-[repeating-conic-gradient(#2a2a28_0_25%,#222220_0_50%)] bg-[length:16px_16px] p-2">
                <canvas
                  ref={(el) => {
                    canvases.current[i] = el;
                  }}
                  className="block h-auto w-full"
                  aria-label={`Sheet ${i + 1} preview`}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-mute">
                  Sheet {i + 1}: {s.placements.length} stickers
                </span>
                <button type="button" className="btn btn-primary !py-1.5 text-sm" onClick={() => void download(i)}>
                  Download PNG
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
