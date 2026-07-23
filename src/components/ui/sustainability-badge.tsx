"use client";

import * as React from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tiny "Made sustainably" badge. Used inline on product cards, the about
 * page, footer and marketing strips so the brand's eco promises are visible
 * across the experience.
 */
export function SustainabilityBadge({
  className,
  size = "sm",
  variant = "default",
}: {
  className?: string;
  size?: "xs" | "sm";
  variant?: "default" | "subtle" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        variant === "default" &&
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        variant === "subtle" && "bg-secondary text-emerald-700 dark:text-emerald-400",
        variant === "outline" &&
          "border border-border bg-transparent text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      <Leaf aria-hidden className={size === "xs" ? "size-3" : "size-3.5"} />
      <span>Made sustainably</span>
    </span>
  );
}
