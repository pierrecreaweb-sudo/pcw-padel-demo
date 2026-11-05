// Service worker minimal : permet d'installer l'espace joueur comme une application. Aucune donnée n'est mise en cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
