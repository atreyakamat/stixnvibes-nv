"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const current = theme === "system" ? resolvedTheme : theme;
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      className="relative grid size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
    >
      {mounted ? (
        current === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}
