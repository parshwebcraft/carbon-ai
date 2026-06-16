/* Facets CRM service worker — offline shell only. */
const CACHE = "facets-shell-v2";
const SHELL = ["/", "/offline.html", "/manifest.json", "/facets-icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept WebSocket upgrades (wss:// or ws://)
  if (url.protocol === "wss:" || url.protocol === "ws:") return;

  // Never cache API calls
  if (url.pathname.startsWith("/api/")) return;

  // Never intercept cross-origin requests (Render backend)
  if (url.origin !== self.location.origin) return;

  // Navigate requests — serve from network, fall back to offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((r) => {
          // Cache a fresh copy of the shell
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return r;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match("/offline.html").then((off) =>
              off || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
            )
          )
        )
    );
    return;
  }

  // Static assets — cache first, network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((r) => {
          if (!r || r.status !== 200 || r.type === "opaque") return r;
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return r;
        })
        .catch(() => cached || new Response("", { status: 408 }));
    })
  );
});
