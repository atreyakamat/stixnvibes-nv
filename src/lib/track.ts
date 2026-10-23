import type { EventType } from "./types";

/** Fire-and-forget count for the admin dashboard. No cookies, no ids. */
export function track(type: EventType, productId: string | null = null) {
  try {
    const body = JSON.stringify([{ type, productId, path: window.location.pathname }]);
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the shop.
  }
}
