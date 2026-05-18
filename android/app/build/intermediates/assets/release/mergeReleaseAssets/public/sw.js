/* BEX Trader Push Service Worker v2.1 - No Chart Action */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "BEX Signal",
      body: event.data ? event.data.text() : "New trading signal",
    };
  }

  const title = data.title || "BEX Signal";

  const options = {
    body: data.body || "New trading signal is ready.",
    icon: data.icon || "/icon-180.png",
    badge: data.badge || "/icon-180.png",
    image: data.image,
    tag: data.tag || data.signal_id || "bex-signal",
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/app/home",
      signal_id: data.signal_id || null,
      symbol: data.symbol || null,
      side: data.side || null,
      entry: data.entry || null,
      sl: data.sl || null,
      tp: data.tp || null,
      confidence: data.confidence || null,
    },
    actions: [
      { action: "open", title: "Open BEX" }
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || "/app/home";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();

          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }

          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});