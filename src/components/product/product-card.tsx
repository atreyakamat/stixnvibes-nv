"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Plus, Heart } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProductCard({
  product,
  className,
  onQuickAdd,
}: {
  product: Product;
  className?: string;
  onQuickAdd?: (p: Product) => void;
}) {
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card premium-card hover:shadow-premium",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        <Link href={`/shop/${product.slug}`} className="block size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </Link>

        {/* Gradient tilt overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.tags.includes("bestseller") && (
            <Badge variant="brand" className="shadow-glow">Best Seller</Badge>
          )}
          {product.tags.includes("new") && <Badge variant="accent">New</Badge>}
          {discount > 0 && (
            <Badge variant="premium" className="bg-brand-purple/15 text-brand-purple border border-brand-purple/25">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-border/60 bg-background/70 backdrop-blur-md text-foreground opacity-0 transition-all duration-300 hover:text-accent group-hover:opacity-100"
        >
          <Heart className="size-4" />
        </button>

        {/* Quick add — slides up on hover */}
        <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            variant="gradient"
            size="sm"
            className="w-full shadow-glow"
            onClick={(e) => {
              e.preventDefault();
              onQuickAdd?.(product);
            }}
          >
            <Plus className="size-4" /> Quick Add
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{product.collection}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-brand-yellow text-brand-yellow" />
            {product.rating.toFixed(1)}
            <span className="text-muted-foreground/70">({product.reviewCount.toLocaleString()})</span>
          </span>
        </div>
        <h3 className="line-clamp-2 font-medium leading-snug tracking-tight">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold">{formatPrice(product.price)}</span>
            {product.compareAt && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAt)}
              </span>
            )}
          </div>
          {product.customizable && (
            <Badge variant="default" size="sm">Customizable</Badge>
          )}
        </div>
      </div>
    </motion.article>
  );
}
