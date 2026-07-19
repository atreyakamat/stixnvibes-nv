import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "default" | "narrow" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-7xl",
        size === "wide" && "max-w-[1440px]",
        size === "full" && "max-w-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
