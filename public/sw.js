const CACHE_PREFIX = "ella-pwa-static-";
const CACHE_NAME = `${CACHE_PREFIX}20261016-2`;
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/logo-mobile-192.png",
  "/logo-mobile-512.png",
  "/logo-mobile-maskable-192.png",
  "/logo-mobile-maskable-512.png",
];
const STATIC_PUBLIC_PATHS = new Set([
  "/offline.html",
  "/manifest.webmanifest",
  "/logo.ico",
  "/logo-in-site.png",
  "/logo-mobile.png",
  "/logo-mobile-192.png",
  "/logo-mobile-512.png",
  "/logo-mobile-maskable-192.png",
  "/logo-mobile-maskable-512.png",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match("/offline.html");
        return offlinePage ?? Response.error();
      }),
    );
    return;
  }

  const isHashedAsset = url.pathname.startsWith("/assets/");
  if (!isHashedAsset && !STATIC_PUBLIC_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
