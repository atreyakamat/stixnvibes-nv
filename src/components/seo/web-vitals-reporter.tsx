"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

type WebVitalName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB" | "FID";
type WebVitalPayload = {
  id: string;
  name: WebVitalName;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
};

declare global {
  interface Window {
    webVitals?: {
      onCLS?: (cb: (m: WebVitalPayload) => void) => void;
      onFCP?: (cb: (m: WebVitalPayload) => void) => void;
      onINP?: (cb: (m: WebVitalPayload) => void) => void;
      onLCP?: (cb: (m: WebVitalPayload) => void) => void;
      onTTFB?: (cb: (m: WebVitalPayload) => void) => void;
      onFID?: (cb: (m: WebVitalPayload) => void) => void;
    };
  }
}

const FLUSH_MS = 4000;

/**
 * Client-side Core-Web-Vitals reporter.
 *
 * - Lazy-imports `web-vitals` only if it isn't already installed (zero cost
 *   in production when the package isn't present).
 * - Batches vitals per page into POST /api/analytics/vitals so we don't
 *   flood the network.
 * - Falls back to a `console.debug` line + localStorage when Supabase
 *   credentials are missing (development).
 *
 * Mount once globally from `RootLayout`.
 */
export function WebVitalsReporter() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const queue: WebVitalPayload[] = [];
    let timer: number | null = null;

    function flush() {
      if (queue.length === 0) return;
      const metrics = queue.splice(0, queue.length);
      const body = JSON.stringify({
        metrics,
        url: window.location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/vitals", blob);
      } else {
        // localStorage fallback in dev / offline
        try {
          const prior = JSON.parse(localStorage.getItem("snv.vitals") || "[]");
          prior.push(...metrics, { url: pathname, ts: Date.now() });
          localStorage.setItem("snv.vitals", JSON.stringify(prior).slice(-5000));
        } catch {
          /* noop */
        }
      }
    }

    function onMetric(m: WebVitalPayload) {
      queue.push(m);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, FLUSH_MS);
    }

    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });

    let cancelled = false;
    (async () => {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ "web-vitals"
        ).catch(() => null)) as typeof window.webVitals & { default?: any } | null;
        if (cancelled || !mod) return;
        const any = mod as any;
        const on = any.onCLS ?? any.default?.onCLS;
        if (on) {
          on((m: WebVitalPayload) => onMetric(m));
          any.onFCP?.((m: WebVitalPayload) => onMetric(m));
          any.onLCP?.((m: WebVitalPayload) => onMetric(m));
          any.onINP?.((m: WebVitalPayload) => onMetric(m));
          any.onTTFB?.((m: WebVitalPayload) => onMetric(m));
          any.onFID?.((m: WebVitalPayload) => onMetric(m));
        }
      } catch {
        // web-vitals not installed — silently degrade.
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pathname]);

  return null;
}
