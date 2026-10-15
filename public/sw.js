// Service worker mínimo: deixa o app instalável e mostra uma página offline
// quando não há conexão. Os dados financeiros nunca são guardados em cache.
const CACHE = "financas-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/pwa-icon/192"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
  }
});
