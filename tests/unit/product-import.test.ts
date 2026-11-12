import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildOptions, fileKey, nameFromFile, parseCsv, readCsv, starterDescription } from "@/lib/product-import";
import { TEMPLATES } from "@/lib/store/seed";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("CSV reading", () => {
  it("handles quotes, commas, newlines and a BOM", () => {
    const rows = parseCsv('﻿file,name,description\r\na.png,"Feeling, Crabby","Line one\nline ""two"""\n\n');
    expect(rows).toEqual([
      ["file", "name", "description"],
      ["a.png", "Feeling, Crabby", 'Line one\nline "two"'],
    ]);
  });

  it("maps header aliases and reports unknown columns", () => {
    const r = readCsv("Filename,Title,MRP,Material,colour\nx.png,X,15,Paper vinyl|Waterproof,red\n");
    expect(r.error).toBeUndefined();
    expect(r.unknown).toEqual(["colour"]);
    expect(r.rows[0]).toEqual({ file: "x.png", name: "X", compare_at: "15", paper: "Paper vinyl|Waterproof" });
  });

  it("needs a file or name column", () => {
    expect(readCsv("price\n10\n").error).toMatch(/file/);
  });

  it("matches files whatever the folder or case", () => {
    expect(fileKey("Goa/Feeling-Crabby.PNG")).toBe("feeling-crabby");
    expect(nameFromFile("posters\\goan_nut-cashew.webp")).toBe("Goan Nut Cashew");
  });
});

describe("paper options", () => {
  it("replaces the sticker material group, keeping known ids", () => {
    const opts = buildOptions("sticker", TEMPLATES.sticker.options, [
      { label: "Waterproof", deltaPaise: 500 },
      { label: "Holographic", deltaPaise: 1000 },
    ]);
    expect(opts).toEqual([
      {
        id: "material",
        name: "Material",
        values: [
          { id: "waterproof", label: "Waterproof", priceDeltaPaise: 500 },
          { id: "holographic", label: "Holographic", priceDeltaPaise: 1000 },
        ],
      },
    ]);
  });

  it("trims poster sizes and keeps the print group in place", () => {
    const sizes = TEMPLATES.poster.options[0].values.filter((v) => v.id === "a4" || v.id === "a3");
    const opts = buildOptions("poster", TEMPLATES.poster.options, [{ label: "Matte paper", deltaPaise: 0 }], { size: sizes });
    expect(opts.map((g) => g.id)).toEqual(["size", "print"]);
    expect(opts[0].values.map((v) => v.id)).toEqual(["a4", "a3"]);
    expect(opts[1].values).toEqual([{ id: "matte", label: "Matte paper", priceDeltaPaise: 0 }]);
  });

  it("drops the paper group when nothing is picked, adds one where the template has none", () => {
    expect(buildOptions("sticker", TEMPLATES.sticker.options, [])).toEqual([]);
    expect(buildOptions("wall-card", TEMPLATES["wall-card"].options, [{ label: "Glossy paper", deltaPaise: 0 }])[0].id).toBe("material");
  });

  it("writes a plain starter description", () => {
    expect(starterDescription("Feeling Crabby", "sticker", ["Paper vinyl", "Waterproof"])).toBe("Feeling Crabby as a die-cut sticker for laptops, bottles and notebooks. Comes in paper vinyl or waterproof.");
  });
});

describe("bulkCreate (import)", () => {
  let ops: typeof import("@/lib/admin/ops");
  let store: ReturnType<typeof import("@/lib/store").getStore>;

  beforeAll(async () => {
    vi.stubEnv("SHOP_DEMO_MODE", "true");
    ops = await import("@/lib/admin/ops");
    store = (await import("@/lib/store")).getStore();
  });

  const base = { type: "sticker", collectionId: "", price: "10", status: "hidden", namePrefix: "" };

  it("still accepts the old shape (admin app)", async () => {
    const r = await ops.bulkCreate({ ...base, items: [{ name: "Old Shape", image: "/lofi/lofi-01.webp" }] });
    expect(r.ok).toBe(true);
    const p = (await store.listProducts({ includeHidden: true })).find((x) => x.name === "Old Shape")!;
    expect(p.options).toEqual(TEMPLATES.sticker.options);
    expect(p.status).toBe("hidden");
  });

  it("creates a new collection, papers, per-item price, stock and paper subset", async () => {
    const r = await ops.bulkCreate({
      ...base,
      newCollection: "Import Test",
      papers: [
        { label: "Paper vinyl", delta: "" },
        { label: "Waterproof", delta: "5" },
      ],
      items: [
        { name: "Crab", image: "/lofi/lofi-02.webp", description: "A crab.", price: "12", stock: "30", tags: "goa, cute", badge: "New" },
        { name: "Cashew", image: "", papers: ["waterproof"] },
      ],
    });
    expect(r).toMatchObject({ ok: true });
    const coll = (await store.listCollections({ includeHidden: true })).find((c) => c.name === "Import Test")!;
    expect(coll.active).toBe(false);
    const all = await store.listProducts({ includeHidden: true });
    const crab = all.find((x) => x.name === "Crab")!;
    expect(crab).toMatchObject({ pricePaise: 1200, stock: 30, tags: ["goa", "cute"], badge: "New", description: "A crab.", collectionIds: [coll.id] });
    expect(crab.options[0].values.map((v) => [v.id, v.priceDeltaPaise])).toEqual([
      ["paper-vinyl", 0],
      ["waterproof", 500],
    ]);
    const cashew = all.find((x) => x.name === "Cashew")!;
    expect(cashew.pricePaise).toBe(1000);
    expect(cashew.images).toEqual([]);
    expect(cashew.options[0].values.map((v) => v.id)).toEqual(["waterproof"]);
  });

  it("rejects bad input with a readable message", async () => {
    const bad = await ops.bulkCreate({ ...base, papers: [{ label: "Gold", delta: "0" }], items: [{ name: "X", image: "", papers: ["Silver"] }] });
    expect(bad).toEqual({ ok: false, error: expect.stringContaining("Silver") });
    const stock = await ops.bulkCreate({ ...base, items: [{ name: "X", image: "", stock: "lots" }] });
    expect(stock.ok).toBe(false);
    const img = await ops.bulkCreate({ ...base, items: [{ name: "X", image: "javascript:alert(1)" }] });
    expect(img.ok).toBe(false);
  });
});
