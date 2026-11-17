/* Astra Team Hub service worker. Phase 4: Web Push only. Phase 5 adds the offline shell. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore malformed payload */ }

  event.waitUntil(
    (async () => {
      // If the app is open and visible, the in-app UI already shows it.
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (wins.some((w) => w.visibilityState === "visible")) return;

      const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/notifications";
      await self.registration.showNotification(String(data.title || "Astra Team Hub").slice(0, 120), {
        body: String(data.body || "").slice(0, 200),
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/notifications";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
