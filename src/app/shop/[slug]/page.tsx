"use client";

import { useEffect, useState } from "react";
import { fetchProductsByCategory, fetchCategories } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [products, setProducts] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, prods] = await Promise.all([
        fetchCategories(),
        fetchProductsByCategory(slug),
      ]);
      const cat = cats.find((c: any) => c.slug === slug);
      setCategoryName(cat?.name ?? slug);
      setProducts(prods);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <p className="text-center py-8">Loading…</p>;

  return (
    <section className="section-pad">
      <h1 className="text-3xl font-bold mb-6 text-center">{categoryName}</h1>
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
