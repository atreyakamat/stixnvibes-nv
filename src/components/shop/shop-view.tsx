"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Star, ChevronDown } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import {
  products as mockProducts,
  trendingCollections,
  type Product,
  type ProductType,
} from "@/lib/data/products";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";

const TYPE_TABS: { label: string; value: ProductType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stickers", value: "sticker_normal" },
  { label: "Vinyl", value: "sticker_vinyl" },
  { label: "Posters", value: "poster" },
  { label: "Spotify Cards", value: "spotify_card" },
  { label: "Frames", value: "frame" },
  { label: "Mystery", value: "mystery_pack" },
];

const MATERIALS = ["Premium Vinyl", "Matte Paper", "Glossy", "Wood", "Acrylic"];
const PRICE_BANDS = [
  { label: "Under ₹150", min: 0, max: 150 },
  { label: "₹150 — ₹300", min: 150, max: 300 },
  { label: "₹300 — ₹500", min: 300, max: 500 },
  { label: "₹500+", min: 500, max: Infinity },
];

export function ShopView() {
  return (
    <React.Suspense fallback={null}>
      <ShopClient />
    </React.Suspense>
  );
}

function ShopClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { addItem } = useCart();

  const initialType = (sp.get("type") as ProductType | null) ?? (sp.get("tab") as ProductType | null);
  const filterParam = sp.get("filter");
  const searchQuery = (sp.get("q") ?? sp.get("search"))?.toLowerCase() ?? "";
  const [sort, setSort] = React.useState<"popular" | "newest" | "price-asc" | "price-desc">(
    filterParam === "new" ? "newest" : filterParam === "popular" ? "popular" : "popular"
  );
  const type = (sp.get("type") || "all") as ProductType | "all";
  const priceBand = sp.get("price") ? Number(sp.get("price")) : null;
  const collection = sp.get("collection") ?? null;
  const material = React.useMemo(
    () => sp.get("material")?.split(",").filter(Boolean) ?? [],
    [sp]
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [addedToast, setAddedToast] = React.useState<string | null>(null);

  const handleQuickAdd = React.useCallback(
    (p: Product) => {
      addItem({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        image: p.image,
        price_cents: p.price * 100,
        variantName: "Standard",
      });
      setAddedToast(p.name);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("snv:cart:add"));
      setTimeout(() => setAddedToast(null), 2000);
    },
    [addItem]
  );

  const [dbProducts, setDbProducts] = React.useState<Product[]>([]);
  const [dbCollections, setDbCollections] = React.useState<any[]>([]);
  const [dbMaterials, setDbMaterials] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch products
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.data) && json.data.length > 0) {
          const active = json.data
            .filter((p: any) => p.status === "active" && p.visibility !== "hidden")
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description || p.short_description || "",
              price: (p.price_cents || 0) / 100,
              compareAt: p.compare_at_cents ? p.compare_at_cents / 100 : undefined,
              currency: p.currency || "INR",
              image: p.image_url || (Array.isArray(p.images) && p.images[0]) || "/images/placeholder.webp",
              images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image_url || "/images/placeholder.webp"],
              type: p.type === "sticker" ? "sticker_normal" : p.type,
              category: p.collection || "Stickers",
              collection: p.collection || "General",
              tags: p.tags || [],
              rating: p.rating || 5.0,
              reviewCount: p.review_count || 0,
              customizable: p.customizable ?? false,
            }));
          if (active.length > 0) setDbProducts(active);
        }
      })
      .catch(() => {});

    // Fetch collections
    fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.data)) setDbCollections(json.data);
      })
      .catch(() => {});

    // Fetch materials
    fetch("/api/admin/materials")
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.data)) setDbMaterials(json.data);
      })
      .catch(() => {});
  }, []);

  const allProducts = dbProducts.length > 0 ? dbProducts : mockProducts;

  const setParam = React.useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, sp]
  );

  // Filtering pipeline
  const filtered = React.useMemo(() => {
    let res = allProducts.slice();
    if (searchQuery) {
      res = res.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.description.toLowerCase().includes(searchQuery) ||
          p.tags.some((t) => t.toLowerCase().includes(searchQuery)) ||
          p.category.toLowerCase().includes(searchQuery)
      );
    }
    // filter=offers|new|popular quick preset
    if (filterParam === "offers") res = res.filter((p) => p.compareAt && p.compareAt > p.price);
    if (type !== "all") res = res.filter((p) => p.type === type);
    if (collection) res = res.filter((p) => p.collection.toLowerCase() === collection.toLowerCase());
    if (priceBand !== null) {
      const band = PRICE_BANDS.find((b) => b.max === priceBand);
      if (band) res = res.filter((p) => p.price >= band.min && p.price < band.max);
    }
    if (material.length) {
      res = res.filter((p) =>
        material.some(
          (m) =>
            (m.toLowerCase() === "premium vinyl" && p.type === "sticker_vinyl") ||
            (m.toLowerCase() === "matte paper" && p.type === "poster") ||
            (m.toLowerCase() === "wood" && p.type === "frame")
        )
      );
    }
    // Sorting
    switch (sort) {
      case "newest":
        res = res.sort((a, b) => (b.tags.includes("new") ? 1 : 0) - (a.tags.includes("new") ? 1 : 0));
        break;
      case "price-asc":
        res = res.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        res = res.sort((a, b) => b.price - a.price);
        break;
      case "popular":
      default:
        res = res.sort((a, b) => b.rating - a.rating);
    }
    return res;
  }, [allProducts, filterParam, searchQuery, type, collection, priceBand, material, sort]);

  const activeCount =
    (type !== "all" ? 1 : 0) +
    (collection ? 1 : 0) +
    (priceBand !== null ? 1 : 0) +
    material.length +
    (searchQuery ? 1 : 0);

  return (
    <Container className="pt-28 pb-12 md:pt-36">
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-yellow text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-2xl animate-bounce">
          Added {addedToast} to cart!
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {mockProducts.length} products · India-wide free shipping over ₹499
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Shop everything <span className="brand-gradient-text">StixNvibes</span>
        </h1>
      </div>

      {/* Type tabs */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-1.5 rounded-full border border-border bg-card p-1">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setParam("type", t.value === "all" ? null : t.value)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                type === t.value || (t.value === "all" && type === "all")
                  ? "bg-brand-gradient text-primary-foreground shadow-glow"
                  : "text-foreground/70 hover:text-foreground hover:bg-secondary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar (sticky) */}
      <div className="sticky top-[80px] z-30 mt-6 -mx-4 bg-background/80 py-3 backdrop-blur px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-full bg-card px-3 py-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium hover:bg-secondary"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="size-4" /> Filters
            {activeCount > 0 && (
              <span className="grid place-items-center rounded-full bg-brand-yellow text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1">
                {activeCount}
              </span>
            )}
          </button>
          <div className="hidden sm:block flex-1" />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Sort</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="appearance-none rounded-full border border-border bg-background pl-3 pr-8 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price · Low to High</option>
                <option value="price-desc">Price · High to Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2" />
            </div>
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {searchQuery && <Chip onClear={() => setParam("q", null)}>Search · "{searchQuery}"</Chip>}
          {type !== "all" && (
            <Chip onClear={() => setParam("type", null)}>
              Type · {TYPE_TABS.find((t) => t.value === type)?.label}
            </Chip>
          )}
          {collection && <Chip onClear={() => setParam("collection", null)}>Theme · {collection}</Chip>}
          {priceBand !== null && (
            <Chip onClear={() => setParam("price", null)}>
              Price · {PRICE_BANDS.find((b) => b.max === priceBand)?.label}
            </Chip>
          )}
          {material.map((m) => (
            <Chip
              key={m}
              onClear={() => {
                const remaining = material.filter((x) => x !== m);
                setParam("material", remaining.length ? remaining.join(",") : null);
              }}
            >
              Material · {m}
            </Chip>
          ))}
          <button
            onClick={() => router.replace(pathname, { scroll: false })}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <p className="text-lg font-medium">No products match those filters.</p>
            <p className="text-sm text-muted-foreground">Try widening your selection or browse all.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <StaggerGroup className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4" stagger={0.04}>
            {filtered.map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} onQuickAdd={handleQuickAdd} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>

      {/* Drawer filter modal */}
      {drawerOpen && (
        <FilterDrawer
          onClose={() => setDrawerOpen(false)}
          filter={{
            type, collection, priceBand, material,
            collections: trendingCollections.map(c => c.title as string),
            setParam,
          }}
        />
      )}
    </Container>
  );
}

function quickAddStub(_p: Product) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("snv:cart:add"));
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs font-medium">
      {children}
      <button onClick={onClear} aria-label="Clear" className="rounded-full hover:text-accent">
        <X className="size-3" />
      </button>
    </span>
  );
}

interface FilterDrawerProps {
  onClose: () => void;
  filter: {
    type: string;
    collection: string | null;
    priceBand: number | null;
    material: string[];
    collections: string[];
    setParam: (key: string, value?: string | null) => void;
  };
}

function FilterDrawer({ onClose, filter }: FilterDrawerProps) {
  const selectedBand = filter.priceBand;
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur" onClick={onClose}>
      <div
        className="absolute right-0 top-0 flex size-full max-w-md flex-col border-l border-border bg-card shadow-premium"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-lg font-semibold">Filters</h3>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <FilterGroup title="Price">
            <div className="grid grid-cols-2 gap-2">
              {PRICE_BANDS.map((band) => (
                <button
                  key={band.label}
                  type="button"
                  onClick={() => filter.setParam("price", selectedBand === band.max ? null : String(band.max))}
                  className={cn(
                    "rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors",
                    selectedBand === band.max ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-secondary"
                  )}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Theme">
            <div className="flex flex-wrap gap-1.5">
              {filter.collections.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => filter.setParam("collection", filter.collection === c ? null : c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                    filter.collection === c ? "bg-brand-gradient text-primary-foreground border-transparent" : "border-border hover:bg-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Material">
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.map((m) => {
                const selected = filter.material.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const next = selected ? filter.material.filter((x) => x !== m) : [...filter.material, m];
                      filter.setParam("material", next.length ? next.join(",") : null);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected ? "bg-accent text-accent-foreground border-transparent" : "border-border hover:bg-secondary"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </FilterGroup>
          <FilterGroup title="Minimum rating">
            <button className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium">
              <Star className="size-3.5 fill-brand-yellow text-brand-yellow" /> 4.5+ &nbsp;(coming soon)
            </button>
          </FilterGroup>
        </div>
        <div className="border-t border-border p-4">
          <Button variant="gradient" size="lg" className="w-full" onClick={onClose}>
            Apply & Show results
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
