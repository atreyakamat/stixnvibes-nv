import * as React from "react";
import { cn } from "@/lib/utils";

export function Kicker({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type SectionHeaderProps = {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  children?: React.ReactNode;
  id?: string;
};

export function SectionHeader({
  kicker,
  title,
  description,
  align = "center",
  className,
  children,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        align === "left" && "items-start text-left",
        className
      )}
      {...props}
    >
      {kicker && (
        <Kicker>
          {kicker}
        </Kicker>
      )}
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl text-balance max-w-3xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg text-balance">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
