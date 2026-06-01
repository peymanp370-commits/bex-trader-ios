import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";

const PUSH_API_BASE =
  import.meta.env.VITE_PUSH_API_BASE ||
  "https://bex-push.peymanp370.workers.dev";

const DEBUG_NATIVE_PUSH = true;

function debugNativePush(message: string) {
  const text = `BEX PUSH DEBUG\n${message}`;
  console.log(text);

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("bex_native_push_debug_last", text);
      localStorage.setItem("bex_native_push_debug_last_at", String(Date.now()));
    }
  } catch (_) {
    // ignore storage debug failures
  }

  if (DEBUG_NATIVE_PUSH && typeof window !== "undefined") {
    window.alert(text);
  }
}

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

function readStorageValue(keys: string[]): string | null {
  try {
    for (const key of keys) {
      const local = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      if (local && String(local).trim()) return String(local).trim();

      const session = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
      if (session && String(session).trim()) return String(session).trim();
    }
  } catch (_) {
    // storage can fail in private mode; push registration should still continue
  }
  return null;
}

function getClientId(): string {
  return (
    readStorageValue([
      "bex_client_id",
      "client_id",
      "vip_client_id",
      "BEX_CLIENT_ID",
      "bex.vip.client_id",
    ]) || "client_peymanp370_main"
  );
}

function getAccountLogin(): string {
  return (
    readStorageValue([
      "bex_account_login",
      "account_login",
      "mt5_account_login",
      "BEX_ACCOUNT_LOGIN",
      "bex.vip.account_login",
    ]) || "5047666801"
  );
}

async function saveNativeToken(token: string) {
  const platform = Capacitor.getPlatform();

  const payload = {
    token,
    device_token: token,
    platform,
    client_id: getClientId(),
    account_login: getAccountLogin(),
    bundle_id: "com.bextrader.app",
    device_label: getDeviceLabel(),
    user_agent: getUserAgent(),
    source: "native_app",
    preference: "instant",
    updated_at: Date.now(),
  };

  const base = cleanBase(PUSH_API_BASE);
  const endpoints = [`${base}/register-device`, `${base}/native-subscribe`];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      debugNativePush(`Saving token\nEndpoint=${endpoint}\nHead=${token.substring(0, 20)}`);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_) {
        data = null;
      }

      if (!res.ok || data?.ok === false) {
        lastError = new Error(data?.error || data?.reason || `native_register_http_${res.status}: ${text.slice(0, 160)}`);
        debugNativePush(`Save failed\nStatus=${res.status}\nBody=${text.slice(0, 220)}`);
        continue;
      }

      debugNativePush(`Save OK\nStatus=${res.status}\nBody=${text.slice(0, 220)}`);
      return data;
    } catch (error: any) {
      lastError = error;
      debugNativePush(`Save exception\n${error?.message || String(error)}`);
    }
  }

  throw lastError || new Error("native_register_failed");
}

let listenersAttached = false;

async function attachNativePushListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  await PushNotifications.addListener("registration", async (token: Token) => {
    try {
      debugNativePush(`TOKEN RECEIVED\nHead=${token.value.substring(0, 24)}\nLength=${token.value.length}`);
      const saved = await saveNativeToken(token.value);
      console.log("BEX native push token saved:", saved);
    } catch (error: any) {
      console.warn("BEX native push token save failed:", error?.message || error);
      debugNativePush(`SAVE FAILED\n${error?.message || String(error)}`);
    }
  });

  await PushNotifications.addListener("registrationError", (error: any) => {
    console.warn("BEX native push registration error:", error);
    debugNativePush(`REG ERROR\n${JSON.stringify(error)}`);
  });

  await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification: PushNotificationSchema) => {
      console.log("BEX native push received:", notification);
      debugNativePush(`PUSH RECEIVED\n${notification?.title || "No title"}`);
    }
  );

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      console.log("BEX native push action:", action);
      debugNativePush(`PUSH ACTION\n${action?.notification?.title || "No title"}`);
    }
  );
}

export async function enableBexNativePushNotifications(): Promise<{
  ok: boolean;
  native: boolean;
  reason?: string;
}> {
  try {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    debugNativePush(`Start\nPlatform=${platform}\nNative=${String(isNative)}`);

    if (!isNative) {
      return { ok: false, native: false, reason: "not_native_platform" };
    }

    await attachNativePushListeners();

    const permission = await PushNotifications.requestPermissions();
    debugNativePush(`Permission=${permission.receive}`);

    if (permission.receive !== "granted") {
      console.warn("BEX native push permission not granted:", permission.receive);
      return { ok: false, native: true, reason: `permission_${permission.receive}` };
    }

    debugNativePush("Calling PushNotifications.register()");
    await PushNotifications.register();
    debugNativePush("Register called. Waiting for APNS token event...");

    return { ok: true, native: true, reason: "register_called" };
  } catch (error: any) {
    console.warn("BEX native push failed:", error);
    debugNativePush(`MAIN FAILED\n${error?.message || String(error)}`);
    return { ok: false, native: true, reason: error?.message || "native_push_failed" };
  }
}
