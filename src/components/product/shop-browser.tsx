"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { fromPrice } from "@/lib/pricing";
import type { Collection, Product } from "@/lib/types";
import { PRODUCT_TYPES } from "@/lib/types";
import { ProductCard } from "./product-card";

type Sort = "featured" | "new" | "price-asc" | "price-desc" | "name";

export function ShopBrowser({ products, collections }: { products: Product[]; collections: Collection[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const type = params.get("type") ?? "all";
  const collection = params.get("collection") ?? "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("featured");
  const q = useDeferredValue(query.trim().toLowerCase());

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const types = PRODUCT_TYPES.filter((t) => products.some((p) => p.type === t.id));

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (type === "all" || p.type === type) &&
        (collection === "all" || p.collectionIds.includes(collection)) &&
        (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)) || p.description.toLowerCase().includes(q)),
    );
    const price = (p: Product) => fromPrice(p) ?? Number.MAX_SAFE_INTEGER;
    if (sort === "new") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list.sort((a, b) => (fromPrice(b) ?? -1) - (fromPrice(a) ?? -1));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    // Upcoming designs go last unless sorting by name.
    if (sort !== "name") list.sort((a, b) => Number(a.status === "upcoming") - Number(b.status === "upcoming"));
    return list;
  }, [products, type, collection, q, sort]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${active ? "bg-lemon text-ink" : "ring-1 ring-paper/25 hover:ring-lemon hover:text-lemon"}`;

  return (
    <div className="mt-8">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Product type">
        <button type="button" className={chip(type === "all")} aria-pressed={type === "all"} onClick={() => setParam("type", "all")}>
          All
        </button>
        {types.map((t) => (
          <button key={t.id} type="button" className={chip(type === t.id)} aria-pressed={type === t.id} onClick={() => setParam("type", t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs" className="field !py-2.5" />
        </label>
        {collections.length > 0 && (
          <label>
            <span className="sr-only">Collection</span>
            <select value={collection} onChange={(e) => setParam("collection", e.target.value)} className="field !py-2.5 sm:!w-auto">
              <option value="all">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field !py-2.5 sm:!w-auto">
            <option value="featured">Featured</option>
            <option value="new">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
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
