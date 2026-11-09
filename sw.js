/* Cache de l'application uniquement. Les réglages et repas restent dans le stockage du navigateur. */
const PREFIX="repas-"+encodeURIComponent(self.registration.scope)+"-";
const CACHE=PREFIX+"v6";
const FICHIERS=["./","index.html","styles.css","app.js","allergenes.js","illustrations.js","manifest.webmanifest","data/references.js","data/ingredients.js","data/recipes-hiver.js","data/recipes-printemps.js","data/recipes-ete.js","data/recipes-automne.js","data/recipes-toute-annee.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX) && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const url=new URL(e.request.url);
 const autorises=FICHIERS.map(p=>new URL(p,self.registration.scope).href);
 if(e.request.method!=="GET" || !autorises.includes(url.href))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));
});
