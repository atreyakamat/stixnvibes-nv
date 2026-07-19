import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/20",
        brand: "bg-brand-gradient text-primary-foreground",
        accent: "bg-accent/15 text-accent border border-accent/25",
        premium: "bg-brand-purple/15 text-brand-purple border border-brand-purple/25",
        success: "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25",
        outline: "border border-border text-foreground",
      },
      size: {
        default: "text-xs",
        sm: "text-[10px] px-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
