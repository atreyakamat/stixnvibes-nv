import type { OptionGroup, OptionValue, ProductType } from "./types";

// Product import: drop a folder of designs (and optionally a CSV), pick the
// paper types, get one product per design. Pure helpers shared by the admin
// form (preview) and the server (the real build). No I/O here.

/** A paper or print finish the customer can pick. `id` matches cost keys like "sticker:waterproof". */
export type PaperPreset = { id: string; label: string; note: string; types: ProductType[] };

// Labels and ids match the existing product templates so new imports line
// up with products already in the shop (cart labels, bundle builder, costs).
export const PAPER_PRESETS: PaperPreset[] = [
  { id: "paper-vinyl", label: "Paper vinyl", note: "Matte, splash-proof. Laptops, notebooks, phone covers.", types: ["sticker", "sheet"] },
  { id: "waterproof", label: "Waterproof", note: "Glossy vinyl. Bottles, bags, anything that gets washed.", types: ["sticker", "sheet"] },
  { id: "normal", label: "Normal print", note: "Poster paper, for frames or tape.", types: ["poster"] },
  { id: "sticker", label: "Sticker (peel and paste)", note: "Sticks straight onto the wall. No frame, no nails.", types: ["poster"] },
  { id: "matte", label: "Matte paper", note: "No shine, soft colours.", types: [] },
  { id: "glossy", label: "Glossy paper", note: "Shiny, punchy colours.", types: [] },
];

/** Where the paper choice lives on a product of this type (kept as in the templates). */
export function paperGroupFor(type: ProductType): { id: string; name: string } {
  return type === "poster" ? { id: "print", name: "Print" } : { id: "material", name: "Material" };
}

/** Starting price (₹) per type, from the shop price list. */
export const DEFAULT_PRICE: Record<ProductType, string> = {
  sticker: "10",
  sheet: "80",
  poster: "60",
  "music-card": "20",
  "wall-card": "30",
};

export const DEFAULT_MIN_QTY: Record<ProductType, number> = { sticker: 1, sheet: 1, poster: 1, "music-card": 5, "wall-card": 1 };

export const valueId = (label: string) =>
  label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export type PaperChoice = { label: string; deltaPaise: number };

/** A paper choice as an option value; presets keep their known ids. */
export function paperValue(p: PaperChoice): OptionValue {
  const preset = PAPER_PRESETS.find((x) => x.label.toLowerCase() === p.label.trim().toLowerCase());
  return { id: preset?.id ?? (valueId(p.label) || "paper"), label: p.label.trim(), priceDeltaPaise: p.deltaPaise };
}

/**
 * The option groups for an imported product: the template's groups with the
 * paper group replaced by the picked papers (dropped when none), and any
 * other group (e.g. poster Size) trimmed to the picked values.
 */
export function buildOptions(type: ProductType, template: OptionGroup[], papers: PaperChoice[], keep?: Record<string, OptionValue[]>): OptionGroup[] {
  const pg = paperGroupFor(type);
  const out: OptionGroup[] = [];
  let placed = false;
  const paperGroup = (): OptionGroup | null => {
    const seen = new Set<string>();
    const values = papers.map(paperValue).filter((v) => v.label && !seen.has(v.id) && seen.add(v.id));
    return values.length ? { id: pg.id, name: pg.name, values } : null;
  };
  for (const g of template) {
    if (g.id === pg.id) {
      const pgv = paperGroup();
      if (pgv) out.push(pgv);
      placed = true;
      continue;
    }
    const values = keep?.[g.id] ?? g.values;
    if (values.length) out.push({ ...g, values: structuredClone(values) });
  }
  if (!placed) {
    const pgv = paperGroup();
    if (pgv) out.push(pgv);
  }
  return out;
}

const orList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

/** A plain starter description from the name, type and papers. Meant to be edited. */
export function starterDescription(name: string, type: ProductType, paperLabels: string[]): string {
  const n = name.trim() || "This design";
  const papers = paperLabels.map((l) => l.toLowerCase());
  switch (type) {
    case "sticker":
      return `${n} as a die-cut sticker for laptops, bottles and notebooks.${papers.length ? ` Comes in ${orList(papers)}.` : ""}`;
    case "sheet":
      return `A ${n} super sheet packed with stickers.${papers.length ? ` Comes in ${orList(papers)}.` : ""}`;
    case "poster":
      return `${n} as an A4 or A3 poster.${papers.length ? ` Pick ${orList(papers)}.` : ""}`;
    case "music-card":
      return `${n} music card with a scannable Spotify code.`;
    case "wall-card":
      return `${n} as a 10 × 10 cm wall card for corners, desks and grids.`;
  }
}

// CSV ---------------------------------------------------------------

export const CSV_COLUMNS = ["file", "name", "description", "price", "compare_at", "paper", "tags", "stock", "badge"] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRow = Partial<Record<CsvColumn, string>>;

export const CSV_TEMPLATE =
  CSV_COLUMNS.join(",") +
  "\n" +
  [
    'feeling-crabby.png,Feeling Crabby,"A grumpy little crab for laptops and bottles.",10,,Paper vinyl|Waterproof,"goa,cute",40,New',
    "goan-nut-cashew.png,Goan Nut,,12,,Waterproof,goa,,",
  ].join("\n") +
  "\n";

/** RFC 4180-ish CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, CsvColumn> = {
  file: "file",
  filename: "file",
  image: "file",
  image_url: "file",
  name: "name",
  title: "name",
  description: "description",
  desc: "description",
  price: "price",
  compare_at: "compare_at",
  compareat: "compare_at",
  was: "compare_at",
  mrp: "compare_at",
  paper: "paper",
  papers: "paper",
  material: "paper",
  tags: "tags",
  stock: "stock",
  badge: "badge",
};

/** CSV text to rows keyed by column. Unknown columns are reported, not fatal. */
export function readCsv(text: string): { rows: CsvRow[]; unknown: string[]; error?: string } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], unknown: [], error: "That CSV is empty." };
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const cols = header.map((h) => HEADER_ALIASES[h] ?? null);
  if (!cols.includes("file") && !cols.includes("name")) return { rows: [], unknown: [], error: 'The first row needs a "file" or "name" column. Download the template to see the layout.' };
  const unknown = header.filter((h, i) => h && cols[i] === null);
  const rows = table.slice(1, 501).map((r) => {
    const out: CsvRow = {};
    cols.forEach((c, i) => {
      if (c && r[i] !== undefined && r[i].trim() !== "") out[c] = r[i].trim();
    });
    return out;
  });
  return { rows, unknown };
}

/** File name without folders and extension, lowercased: the key rows and images meet on. */
export const fileKey = (f: string) =>
  f
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .toLowerCase();

export const nameFromFile = (f: string) =>
  f
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** "Paper vinyl | Waterproof" to labels. */
export const splitList = (v: string | undefined, sep = /[|;]/) =>
  (v ?? "")
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

/** A row's file cell is a link when it's a full URL or a site path, otherwise a file name to match. */
export const isImageLink = (v: string) => /^https:\/\//i.test(v) || /^\/[^/]/.test(v);
