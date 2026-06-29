import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";

const PUSH_API_BASE =
  import.meta.env.VITE_PUSH_API_BASE ||
  "https://bex-push.peymanp370.workers.dev";

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

function getClientId(): string | null {
  return (
    readStorageValue([
      "bex_client_id",
      "client_id",
      "vip_client_id",
      "BEX_CLIENT_ID",
      "bex.vip.client_id",
    ]) || null
  );
}

function getAccountLogin(): string | null {
  return (
    readStorageValue([
      "bex_account_login",
      "account_login",
      "mt5_account_login",
      "BEX_ACCOUNT_LOGIN",
      "bex.vip.account_login",
    ]) || null
  );
}

async function saveNativeToken(token: string) {
  const platform = Capacitor.getPlatform();
  const clientId = getClientId();
  const accountLogin = getAccountLogin();

  // Do NOT silently bind an unidentified device to the developer's own
  // account. If the user hasn't logged in yet (or storage is empty/cleared),
  // there is no safe owner to fall back to - skip the backend registration
  // call entirely rather than registering this device under someone else's
  // client_id/account_login. The token listener still ran, so iOS APNS
  // registration itself is unaffected; we just don't bind it to an account
  // until we actually know whose device this is.
  if (!clientId || !accountLogin) {
    console.warn(
      "BEX native push: no logged-in client_id/account_login yet, skipping device registration"
    );
    return { ok: false, skipped: true, reason: "no_identity_yet" };
  }

  const payload = {
    token,
    device_token: token,
    platform,
    client_id: clientId,
    account_login: accountLogin,
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
      const res = await CapacitorHttp.post({
        url: endpoint,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: payload,
      });

      const data: any = res.data;
      const ok = Number(res.status) >= 200 && Number(res.status) < 300;

      if (!ok || data?.ok === false) {
        lastError = new Error(data?.error || data?.reason || `native_register_http_${res.status}`);
        continue;
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("native_register_failed");
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

    // Re-run registration on each app open/focus so iOS can refresh or re-emit the APNS token.
    started = true;

    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      console.warn("BEX native push permission not granted:", permission.receive);
      return { ok: false, native: true, reason: `permission_${permission.receive}` };
    }

    await PushNotifications.addListener("registration", async (token: Token) => {
      try {
        console.log("BEX native push token:", token.value);
        const saved = await saveNativeToken(token.value);
        console.log("BEX native push token saved:", saved);
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
    started = false;
    return { ok: false, native: true, reason: error?.message || "native_push_failed" };
  }
}

