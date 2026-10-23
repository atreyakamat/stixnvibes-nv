"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { fromPrice } from "@/lib/orders/pricing";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

type Sort = "featured" | "price-asc" | "price-desc" | "name";

export function ShopBrowser({
  products,
  categories,
}: {
  products: Product[];
  categories: { id: string; label: string }[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const category = params.get("category") ?? "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("featured");
  const q = useDeferredValue(query.trim().toLowerCase());

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))),
    );
    const price = (p: Product) => fromPrice(p) ?? Number.MAX_SAFE_INTEGER;
    if (sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list.sort((a, b) => (fromPrice(b) ?? -1) - (fromPrice(a) ?? -1));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, q, sort]);

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm transition-colors ${active ? "bg-lemon text-ink" : "ring-1 ring-paper/25 hover:ring-lemon hover:text-lemon"}`;

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <button type="button" className={chip(category === "all")} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={chip(category === c.id)}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex-1 lg:w-64">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="field !py-2.5"
            />
          </label>
          <label>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field !w-auto !py-2.5">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>

      <p className="label mt-8 text-mute" aria-live="polite">
        {shown.length} {shown.length === 1 ? "item" : "items"}
      </p>
      {shown.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {shown.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-paper/70">Nothing matches that yet. Try another search, or ask us on Instagram.</p>
      )}
    </div>
  );
}
