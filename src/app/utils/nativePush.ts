import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";

const PUSH_API_BASE =
  import.meta.env.VITE_PUSH_API_BASE ||
  "https://bex-push-worker.peymanp370.workers.dev";

function cleanBase(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

function getUserAgent(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

function getDeviceLabel(): string {
  const userAgent = getUserAgent();

  if (/iPhone/i.test(userAgent)) return "iPhone Native App";
  if (/iPad/i.test(userAgent)) return "iPad Native App";
  if (/Android/i.test(userAgent)) return "Android Native App";

  const platform = Capacitor.getPlatform();
  return `${platform || "native"} Native App`;
}

async function saveNativeToken(token: string) {
  const payload = {
    token,
    platform: Capacitor.getPlatform(),
    device_label: getDeviceLabel(),
    user_agent: getUserAgent(),
    source: "capacitor-native",
    preference: "instant",
    updated_at: Date.now(),
  };

  const res = await fetch(`${cleanBase(PUSH_API_BASE)}/native-subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.reason || `native_subscribe_http_${res.status}`);
  }

  return data;
}

let started = false;

export async function enableBexNativePushNotifications(): Promise<{
  ok: boolean;
  native: boolean;
  reason?: string;
}> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, native: false, reason: "not_native_platform" };
    }

    if (started) {
      return { ok: true, native: true, reason: "already_started" };
    }

    started = true;

    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      return { ok: false, native: true, reason: `permission_${permission.receive}` };
    }

    await PushNotifications.addListener("registration", async (token: Token) => {
      try {
        console.log("BEX native push token:", token.value);
        await saveNativeToken(token.value);
        console.log("BEX native push token saved");
      } catch (error: any) {
        console.warn("BEX native push token save failed:", error?.message || error);
      }
    });

    await PushNotifications.addListener("registrationError", (error: any) => {
      console.warn("BEX native push registration error:", error);
    });

    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("BEX native push received:", notification);
      }
    );

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log("BEX native push action:", action);
      }
    );

    await PushNotifications.register();

    return { ok: true, native: true };
  } catch (error: any) {
    console.warn("BEX native push failed:", error);
    return { ok: false, native: true, reason: error?.message || "native_push_failed" };
  }
}
