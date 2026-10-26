// Lays stickers out on Cricut Print Then Cut sheets. Pure functions (no
// canvas) so they can be tested; the sheet maker draws what they return.
//
// Cricut Design Space prints Print Then Cut images up to 6.75 × 9.25 in on
// A4 or Letter. It cuts around the outer edge of every separate shape in a
// transparent PNG, so each sticker gets a white border (the cut runs on its
// edge) and a gap to the next one.

export type SheetSpec = {
  /** Printable area in inches. */
  widthIn: number;
  heightIn: number;
  /** Pixels per inch of the exported PNG. */
  dpi: number;
  /** Longest side of each design, before the border, in inches. */
  sizeIn: number;
  /** White border around each design, in inches. The cut follows its edge. */
  borderIn: number;
  /** Space between bordered stickers, in inches. */
  gapIn: number;
};

export const PRINT_THEN_CUT_MAX = { widthIn: 6.75, heightIn: 9.25 } as const;

export const DEFAULT_SPEC: SheetSpec = { ...PRINT_THEN_CUT_MAX, dpi: 300, sizeIn: 2, borderIn: 0.06, gapIn: 0.15 };

export type SheetItem = { key: string; aspect: number; qty: number };
/** Pixel boxes on the sheet: `x,y,w,h` is the design, `outer` adds the border. */
export type Placement = { key: string; x: number; y: number; w: number; h: number };
export type Sheet = { widthPx: number; heightPx: number; placements: Placement[] };

const px = (inches: number, dpi: number) => Math.round(inches * dpi);

/** The design's size in pixels: longest side = sizeIn, aspect kept. */
export function designBox(aspect: number, spec: SheetSpec) {
  const long = px(spec.sizeIn, spec.dpi);
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return a >= 1 ? { w: long, h: Math.max(1, Math.round(long / a)) } : { w: Math.max(1, Math.round(long * a)), h: long };
}

/** Why the spec can't work, or null. */
export function specProblem(spec: SheetSpec): string | null {
  if (!(spec.widthIn > 0 && spec.heightIn > 0)) return "Set the sheet size.";
  if (!(spec.sizeIn > 0)) return "Set the sticker size.";
  if (spec.borderIn < 0 || spec.gapIn < 0) return "Border and gap can't be negative.";
  const foot = spec.sizeIn + 2 * spec.borderIn;
  if (foot > spec.widthIn || foot > spec.heightIn) return "Stickers that size don't fit on the sheet. Make them smaller.";
  return null;
}

/**
 * Shelf packing: tallest stickers first, left to right, a new row when the
 * width runs out, a new sheet when the height does. Same designs stay
 * together so a sheet is easy to check by eye.
 */
export function layoutSheets(items: SheetItem[], spec: SheetSpec): Sheet[] {
  const W = px(spec.widthIn, spec.dpi);
  const H = px(spec.heightIn, spec.dpi);
  const b = px(spec.borderIn, spec.dpi);
  const g = px(spec.gapIn, spec.dpi);
  const units = items
    .filter((i) => i.qty > 0)
    .map((i, order) => ({ ...i, order, box: designBox(i.aspect, spec) }))
    .sort((a, c) => c.box.h - a.box.h || a.order - c.order)
    .flatMap((i) => Array.from({ length: Math.floor(i.qty) }, () => i));

  const sheets: Sheet[] = [];
  let sheet: Sheet | null = null;
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const u of units) {
    const ow = u.box.w + 2 * b;
    const oh = u.box.h + 2 * b;
    if (ow > W || oh > H) throw new Error("A sticker is bigger than the sheet.");
    if (sheet && x + ow > W) {
      x = 0;
      y += rowH + g;
      rowH = 0;
    }
    if (!sheet || y + oh > H) {
      sheet = { widthPx: W, heightPx: H, placements: [] };
      sheets.push(sheet);
      x = 0;
      y = 0;
      rowH = 0;
    }
    sheet.placements.push({ key: u.key, x: x + b, y: y + b, w: u.box.w, h: u.box.h });
    x += ow + g;
    rowH = Math.max(rowH, oh);
  }
  return sheets;
}

/** How many of one design fit on a single sheet, to suggest "fill the sheet". */
export function perSheet(aspect: number, spec: SheetSpec): number {
  try {
    return layoutSheets([{ key: "x", aspect, qty: 500 }], spec)[0]?.placements.length ?? 0;
  } catch {
    return 0;
  }
}

// PNG resolution ----------------------------------------------------------
// Canvas PNGs carry no DPI. A pHYs chunk lets apps that read it open the
// sheet at its real size. Not every app does, so the sheet maker also says
// which width to set after uploading.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Returns the PNG with a pHYs chunk for `dpi` right after IHDR (replacing any). */
export function withDpi(png: Uint8Array, dpi: number): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 33 || sig.some((v, i) => png[i] !== v)) throw new Error("Not a PNG");
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));

  // Copy every chunk except an existing pHYs, inserting ours after IHDR.
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  let off = 8;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (off + 12 <= png.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(...png.subarray(off + 4, off + 8));
    const end = off + 12 + len;
    if (type !== "pHYs") parts.push(png.subarray(off, end));
    if (type === "IHDR") parts.push(chunk);
    off = end;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
