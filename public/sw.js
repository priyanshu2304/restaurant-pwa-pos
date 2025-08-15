// const CACHE = 'app-cache-v1';
// const ASSETS = ['/', '/index.html', '/src/styles/print.css'];

// self.addEventListener('install', (e) => {
//   e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
// });
// self.addEventListener('activate', (e) => {
//   e.waitUntil(
//     caches.keys().then((keys) =>
//       Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
//     )
//   );
// });
// self.addEventListener('fetch', (e) => {
//   const { request } = e;
//   if (request.method !== 'GET') return;
//   e.respondWith(
//     caches.match(request).then((cached) => {
//       const fetchPromise = fetch(request)
//         .then((res) => {
//           const copy = res.clone();
//           caches.open(CACHE).then((c) => c.put(request, copy));
//           return res;
//         })
//         .catch(() => cached);
//       return cached || fetchPromise;
//     })
//   );
// });

const CACHE_NAME = "billing-v1";
const OFFLINE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/src/main.jsx",
  "/src/App.jsx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(OFFLINE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Network-first for navigation and main assets; fallback to cache
  event.respondWith(
    (async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        if (req.method === "GET" && req.url.startsWith(self.location.origin)) {
          cache.put(req, net.clone());
        }
        return net;
      } catch (e) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        // Fallback to index for SPA navigations
        if (req.mode === "navigate") {
          return caches.match("/index.html");
        }
        throw e;
      }
    })()
  );
});
