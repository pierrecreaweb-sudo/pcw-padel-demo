// Service worker du back-office : met en cache l'interface pour un démarrage rapide
// et un affichage hors ligne. Les données (Supabase) ne sont jamais mises en cache.
const CACHE = "pcw-coach-v1";
const SHELL = ["./", "./index.html", "./admin.css", "./admin.js", "./icon.svg", "./manifest.webmanifest",
  "../assets/config.js", "../assets/core.js", "../assets/demo-data.js", "../assets/api.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Réseau d'abord pour l'interface (toujours la dernière version), cache en secours hors ligne.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
