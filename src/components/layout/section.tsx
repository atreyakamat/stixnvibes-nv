import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({
  className,
  children,
  spacing = "default",
  background = "default",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  spacing?: "none" | "tight" | "default" | "loose";
  background?: "default" | "muted" | "gradient" | "dark";
}) {
  return (
    <section
      className={cn(
        "relative",
        spacing === "tight" && "py-10 md:py-14",
        spacing === "default" && "section-pad",
        spacing === "loose" && "py-24 md:py-32 lg:py-40",
        background === "muted" && "bg-muted/30",
        background === "gradient" && "bg-brand-mesh",
        background === "dark" && "bg-zinc-950 text-white dark:bg-zinc-950/40",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
