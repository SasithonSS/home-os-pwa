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

// the morning notification from supabase/notify.py: { title, body, url }
self.addEventListener("push", (e) => {
  let m = { title: "Home OS", body: "" };
  try {
    m = { ...m, ...e.data.json() };
  } catch {
    m.body = e.data ? e.data.text() : "";
  }
  e.waitUntil(self.registration.showNotification(m.title, { body: m.body, icon: "icon-192.png", badge: "icon-192.png", data: m.url || "./" }));
});
// tapping it opens the app (or brings it to the front) on the วันนี้ tab
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if ("focus" in c) return c.focus();
      return self.clients.openWindow(new URL(e.notification.data || "./", self.registration.scope).href);
    }),
  );
});
