"use client";

import { useEffect, useState } from "react";
import { fetchCategories, fetchProducts } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Shop() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      setCategories(cats);
      setProducts(prods);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-center py-8">Loading…</p>;

  return (
    <section className="section-pad">
      <h1 className="text-4xl font-bold text-center mb-8">Shop</h1>
      {/* Category navigation */}
      <nav className="flex flex-wrap justify-center gap-4 mb-12">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/shop/${cat.slug}`}>
            <Button variant="outline" size="sm">{cat.name}</Button>
          </Link>
        ))}
      </nav>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`}>
            <Card className="hover:shadow-lg transition-shadow">
              <Image
                src={p.image_url ?? "/placeholder.png"}
                alt={p.name}
                width={400}
                height={300}
                className="object-cover rounded-t-xl"
              />
              <div className="p-4">
                <h2 className="font-semibold text-lg mb-1">{p.name}</h2>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {p.short_description}
                </p>
                <p className="text-primary font-bold">{formatPrice(p.price_cents / 100)}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents);
}
