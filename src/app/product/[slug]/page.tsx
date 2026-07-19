"use client";

import { useEffect, useState } from "react";
import { fetchProductBySlug } from "@/lib/supabase/queries";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchProductBySlug(slug);
      setProduct(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <p className="text-center py-8">Loading…</p>;
  if (!product) return <p className="text-center py-8">Product not found.</p>;

  return (
    <section className="section-pad">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src={product.image_url ?? "/placeholder.png"}
            alt={product.name}
            width={600}
            height={600}
            className="rounded-xl object-cover"
          />
        </motion.div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-lg text-primary font-bold mb-2">
            {formatPrice(product.price_cents / 100)}
          </p>
          <p className="mb-4 text-muted-foreground">{product.description}</p>
          {/* Variant selector placeholder */}
          <div className="flex space-x-2 mb-4">
            <Button variant="outline">Size: M</Button>
            <Button variant="outline">Color: Red</Button>
          </div>
          <Button className="mr-2">Add to Cart</Button>
          <Button variant="secondary">Buy Now</Button>
        </div>
      </div>

      {/* Related products placeholder */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Related Products</h2>
        <p className="text-muted-foreground">(Coming soon)</p>
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
