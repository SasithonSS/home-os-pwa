// Home OS จด: keep the page and its files so it opens without signal. Calls to Supabase are never cached.
// Every same-site GET goes to the network first (so a new build shows at once) and falls back to the last copy.
const CACHE = "homeos-phone";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  // the version 1 caches (homeos-pwa-v*) are no use to version 2
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((r) => {
        if (r.ok) {
          const c = r.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match(self.registration.scope))),
  );
});
