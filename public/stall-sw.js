// Service worker for stall mode (/admin/stall) only. Keeps the page, its
// code, fonts and product photos on the phone so stall mode opens again with
// no signal. Sales themselves live in localStorage and sync from the page.
//
// Page: network first, the saved copy when offline.
// /_next/static/*: saved forever (file names change on every deploy).
// Images: the saved copy, refreshed in the background.

const CACHE = "snv-stall-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The page lists what it loaded, so the first visit is saved too.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        event.data.urls.slice(0, 400).map(async (url) => {
          if (await cache.match(url)) return;
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res.ok) await cache.put(url, res);
          } catch {
            // Offline: it's saved next time.
          }
        }),
      ),
    ),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    // Only a real page, not the login redirect.
    if (res.ok && !res.redirected) await cache.put("/admin/stall", res.clone());
    return res;
  } catch {
    return (await cache.match("/admin/stall")) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit ?? Response.error());
  return hit ?? fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.pathname === "/admin/stall") {
    event.respondWith(networkFirst(request));
  } else if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
