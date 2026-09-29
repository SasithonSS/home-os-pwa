// Home OS จด: cache the page itself so it opens without signal. Calls to script.google.com are never cached.
const CACHE = "homeos-pwa-v6"; // bump on every deploy · v6: delete an entry
const SHELL = ["./", "index.html", "app.js", "app.css", "manifest.webmanifest", "icon-180.png", "icon-192.png", "logo-login.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // no-cache: check with GitHub every time (Pages lets browsers keep a file 10 minutes, so a new version showed up late)
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
