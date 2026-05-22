/* BEX Trader Push Service Worker v2.2 - Pro Branded Notifications */

const BEX_NOTIFICATION_ASSETS = {
  icon: "/icon-192.png",
  badge: "/badge-72.png",
  image: "/bex-notification-banner.png",
  fallbackIcon: "/icon-180.png",
  openUrl: "/app/home",
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function asText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function asNumberText(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function normalizePayload(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const nested = data.data && typeof data.data === "object" ? data.data : {};
  return { ...nested, ...data };
}

function statusTitle(status) {
  const s = asText(status).toUpperCase();
  if (s === "POSITION_OPENED") return "BEX Trade Opened";
  if (s === "POSITION_CLOSED") return "BEX Trade Closed";
  if (s === "ORDER_PLACED") return "BEX Order Placed";
  if (s === "ORDER_CANCELLED") return "BEX Order Cancelled";
  if (s === "ORDER_CANCEL_FAILED") return "BEX Order Cancel Failed";
  if (s.startsWith("BLOCKED") || s.startsWith("REJECTED")) return "BEX Trade Blocked";
  return "BEX Signal";
}

function buildBody(data) {
  if (data.body) return asText(data.body);

  const symbol = asText(data.symbol || data.broker_symbol, "BEX").toUpperCase();
  const side = asText(data.side).toUpperCase();
  const orderType = asText(data.order_type).replace(/_/g, " ").toUpperCase();
  const lot = asNumberText(data.lot || data.volume, 2);
  const price = asNumberText(data.entry || data.fill_price || data.price, symbol.includes("XAU") ? 2 : 3);
  const parts = [symbol];

  if (side) parts.push(side);
  if (lot) parts.push(`${lot} lot`);
  if (price) {
    const label = String(data.status || "").toUpperCase() === "POSITION_CLOSED" ? "Closed" : "Entry";
    parts.push(`${label} ${price}`);
  }
  if (orderType && !["BUY", "SELL"].includes(orderType)) parts.push(orderType);

  return parts.join(" • ") || "New trading update is ready.";
}

function buildTag(data) {
  if (data.tag) return asText(data.tag);

  const status = asText(data.status || data.trade_state || "signal").toUpperCase();
  const symbol = asText(data.symbol || data.broker_symbol || "BEX").toUpperCase();
  const positionId = asText(data.position_id || data.positionId);
  const orderId = asText(data.order_id || data.orderId);
  const ticket = asText(data.ticket);
  const signalId = asText(data.signal_id);

  if (status === "POSITION_OPENED" && positionId && positionId !== "0") return `bex-open-${symbol}-${positionId}`;
  if (status === "POSITION_CLOSED" && positionId && positionId !== "0") return `bex-close-${symbol}-${positionId}`;
  if (status === "ORDER_PLACED" && orderId && orderId !== "0") return `bex-order-${symbol}-${orderId}`;
  if (status.includes("CANCEL") && orderId && orderId !== "0") return `bex-cancel-${symbol}-${orderId}`;
  if (ticket && ticket !== "0") return `bex-${status}-${symbol}-${ticket}`;
  if (signalId) return `bex-signal-${symbol}-${signalId}`;
  return `bex-${status}-${symbol}`;
}

function shouldShowImage(data) {
  if (data.image === null || data.image === false || data.image === "") return false;
  const status = asText(data.status).toUpperCase();
  return ["POSITION_OPENED", "POSITION_CLOSED", "ORDER_PLACED"].includes(status);
}

self.addEventListener("push", (event) => {
  let raw = {};

  try {
    raw = event.data ? event.data.json() : {};
  } catch (e) {
    raw = {
      title: "BEX Signal",
      body: event.data ? event.data.text() : "New trading signal",
    };
  }

  const data = normalizePayload(raw);
  const title = asText(data.title, statusTitle(data.status));
  const url = asText(data.url || data.open_url || data.deep_link, BEX_NOTIFICATION_ASSETS.openUrl);
  const icon = asText(data.icon, BEX_NOTIFICATION_ASSETS.icon || BEX_NOTIFICATION_ASSETS.fallbackIcon);
  const badge = asText(data.badge, BEX_NOTIFICATION_ASSETS.badge || BEX_NOTIFICATION_ASSETS.icon);
  const image = shouldShowImage(data) ? asText(data.image, BEX_NOTIFICATION_ASSETS.image) : undefined;

  const options = {
    body: buildBody(data),
    icon,
    badge,
    image,
    tag: buildTag(data),
    renotify: data.renotify === true,
    requireInteraction: data.requireInteraction === true || data.require_interaction === true,
    silent: data.silent === true,
    timestamp: Number(data.timestamp || data.ts || Date.now()),
    data: {
      url,
      status: data.status || null,
      signal_id: data.signal_id || null,
      symbol: data.symbol || data.broker_symbol || null,
      side: data.side || null,
      lot: data.lot || data.volume || null,
      entry: data.entry || null,
      fill_price: data.fill_price || null,
      sl: data.sl || null,
      tp: data.tp || null,
      order_id: data.order_id || null,
      position_id: data.position_id || null,
      ticket: data.ticket || null,
      report_id: data.report_id || null,
    },
    actions: Array.isArray(data.actions) && data.actions.length
      ? data.actions
      : [{ action: "open", title: "Open BEX" }],
  };

  // Remove undefined fields for stricter browsers.
  Object.keys(options).forEach((key) => options[key] === undefined && delete options[key]);

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || BEX_NOTIFICATION_ASSETS.openUrl;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) return client.navigate(targetUrl);
          return;
        }
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })()
  );
});
