/* Service worker : cache local pour usage hors connexion. Aucune donnée ne quitte l'appareil. */
const CACHE = "repas-semaine-v1";
const FICHIERS = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "data/references.js", "data/ingredients.js", "data/recipes-hiver.js", "data/recipes-printemps.js",
  "data/recipes-ete.js", "data/recipes-automne.js", "data/recipes-toute-annee.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
