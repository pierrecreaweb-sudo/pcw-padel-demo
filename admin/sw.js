// Service worker du back-office : met en cache l'interface pour un démarrage rapide
// et un affichage hors ligne. Les données (Supabase) ne sont jamais mises en cache.
const CACHE = "pcw-coach-v21";
const SHELL = ["./", "./index.html", "./admin.css", "./admin.js", "./icon.svg", "./icon-192.png", "./manifest.webmanifest",
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

// Notifications push : réservation, annulation, avis, message... (envoyées par la fonction push-worker).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "PCW Padel Coach", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: "refresh-nav" }))));
  e.waitUntil(self.registration.showNotification(d.title || "PCW Padel Coach", {
    body: d.body || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    lang: "fr",
    data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    if (open) { open.postMessage({ type: "goto", url: target }); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
