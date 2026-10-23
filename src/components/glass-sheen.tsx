"use client";

import { useEffect } from "react";

/**
 * One delegated pointer listener moves the light on `.ice` surfaces. It runs
 * only for fine pointers and respects reduced motion.
 */
export function GlassSheen() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = (e.target as Element | null)?.closest<HTMLElement>(".ice");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <div aria-hidden="true" className="scroll-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-lemon" />;
}
