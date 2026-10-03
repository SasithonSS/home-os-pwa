// Home OS จด: keep the page and its files so it opens without signal. Calls to Supabase are never cached.
// Every same-site GET goes to the network first (so a new build shows at once) and falls back to the last copy.
// One copy of each file: a query (the update check's ?v=…, main.tsx) is left off the name it's kept under, and when the
// page comes in, the scripts and styles of builds it no longer uses are dropped.
const CACHE = "homeos-phone";
const bare = (url) => url.split("#")[0].split("?")[0];
const ASSET = /assets\/[\w.-]+/g;
async function prune(page) {
  const used = new Set((await page.text()).match(ASSET) || []);
  if (!used.size) return; // not the app's page (an error page?): leave what's kept alone
  const c = await caches.open(CACHE);
  for (const k of await c.keys()) {
    const a = k.url.match(ASSET);
    if (k.url.includes("?") || (a && !used.has(a[0]))) await c.delete(k);
  }
}
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
          const page = bare(e.request.url) === self.registration.scope ? r.clone() : null;
          e.waitUntil(caches.open(CACHE).then((x) => x.put(bare(e.request.url), c)).then(() => page && prune(page)));
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
// tapping it opens the app (or brings it to the front) on the วันนี้ tab, with แจ้งเตือน open: the whole message
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs)
        if ("focus" in c) {
          // an app already open goes to วันนี้, the message open in full (App.tsx), or what the notification says to open
          c.postMessage({ tab: "today", open: new URL(e.notification.data || "./", self.registration.scope).searchParams.get("open") || "notifs" });
          return c.focus();
        }
      const url = new URL(e.notification.data || "./", self.registration.scope);
      if (!url.searchParams.has("open")) url.searchParams.set("open", "notifs"); // the lock screen shows the first lines: the app, all of it
      return self.clients.openWindow(url.href);
    }),
  );
});
