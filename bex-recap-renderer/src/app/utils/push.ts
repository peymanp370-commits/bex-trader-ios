export type PushMode = "off" | "instant" | "strong";

const PUSH_MODE_KEY = "push_mode";
const SUBSCRIPTION_KEY = "bex_push_subscription_v1";

export function getPushMode(): PushMode {
  try {
    const value = localStorage.getItem(PUSH_MODE_KEY) as PushMode | null;
    if (value === "off" || value === "instant" || value === "strong") return value;
  } catch {}
  return "instant";
}

export function setPushMode(mode: PushMode) {
  try {
    localStorage.setItem(PUSH_MODE_KEY, mode);
  } catch {}
}

export function canReceivePush(plan: string, confidence: number) {
  const mode = getPushMode();
  const userPlan = String(plan || "FREE").toUpperCase();

  if (mode === "off") return false;
  if (mode === "instant") return true;

  if (mode === "strong") {
    if (userPlan !== "VIP") return false;
    return Number(confidence || 0) >= 70;
  }

  return false;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as any).standalone === true
  );
}

export function canUseWebPushInThisContext(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;

  // iPhone/iPad push works only when app is installed/opened as PWA.
  if (isIOSDevice() && !isStandalonePWA()) return false;

  return true;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerBexServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn("BEX service worker register failed:", error);
    return null;
  }
}

export async function getBexPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await registerBexServiceWorker();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function disableBexPushNotifications(): Promise<boolean> {
  try {
    const registration = await registerBexServiceWorker();
    if (!registration) return false;

    const sub = await registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    try {
      localStorage.removeItem(SUBSCRIPTION_KEY);
    } catch {}

    return true;
  } catch (error) {
    console.warn("BEX push disable failed:", error);
    return false;
  }
}

export async function enableBexPushNotifications(options?: {
  mode?: PushMode;
  plan?: string;
  userId?: string | number | null;
  email?: string | null;
}): Promise<{
  ok: boolean;
  subscribed: boolean;
  reason?: string;
  permission?: NotificationPermission;
}> {
  try {
    const mode = options?.mode || getPushMode();

    if (mode === "off") {
      await disableBexPushNotifications();
      return { ok: true, subscribed: false, reason: "push_off" };
    }

    if (!canUseWebPushInThisContext()) {
      return {
        ok: false,
        subscribed: false,
        reason: isIOSDevice() && !isStandalonePWA() ? "ios_requires_pwa" : "web_push_not_supported",
      };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const pushApiBase = import.meta.env.VITE_PUSH_API_BASE;

    if (!vapidPublicKey) return { ok: false, subscribed: false, reason: "missing_vapid_public_key" };
    if (!pushApiBase) return { ok: false, subscribed: false, reason: "missing_push_api_base" };

    const registration = await registerBexServiceWorker();
    if (!registration) return { ok: false, subscribed: false, reason: "service_worker_failed" };

    let permission: NotificationPermission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return { ok: false, subscribed: false, reason: "permission_not_granted", permission };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const payload = {
      ...subscription.toJSON(),
      preference: mode,
      push_mode: mode,
      plan: String(options?.plan || "FREE").toUpperCase(),
      user_id: options?.userId ?? null,
      email: options?.email ?? null,
      source: "bex_web_app",
      ts: Date.now(),
    };

    const res = await fetch(`${String(pushApiBase).replace(/\/+$/, "")}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.ok === false) {
      return {
        ok: false,
        subscribed: false,
        reason: data?.error || `subscribe_http_${res.status}`,
        permission,
      };
    }

    try {
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(payload));
    } catch {}

    return { ok: true, subscribed: true, permission };
  } catch (error: any) {
    console.warn("BEX push enable failed:", error);
    return {
      ok: false,
      subscribed: false,
      reason: error?.message || "push_enable_failed",
    };
  }
}

export async function syncBexPushPreference(options?: {
  mode?: PushMode;
  plan?: string;
  userId?: string | number | null;
  email?: string | null;
}) {
  const mode = options?.mode || getPushMode();

  if (mode === "off") {
    setPushMode("off");
    return disableBexPushNotifications();
  }

  setPushMode(mode);
  return enableBexPushNotifications(options);
}
