const CACHE_NAME = "matclock-v4";
const ASSETS = [
  "/",
  "/privacy",
  "/cookies",
  "/manifest.webmanifest",
  "/images/logo.png",
  "/images/favicon-16x16.png",
  "/images/favicon-32x32.png",
  "/images/apple-touch-icon.png",
  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/badges/app-store.svg",
  "/images/badges/google-play.png",
  "/images/badges/microsoft-store.svg",
  "/sounds/start.mp3",
  "/sounds/warning.mp3",
  "/sounds/end.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
