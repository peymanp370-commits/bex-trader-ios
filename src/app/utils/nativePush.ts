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

function getClientId(): string {
  // NOTE: previously fell back to a hardcoded developer test value
  // ("client_peymanp370_main") when nothing was found in storage. That
  // caused every user without a saved client_id to silently register
  // their push token under someone else's identity. Return "" instead
  // so the caller can detect "we don't know who this is" explicitly.
  return (
    readStorageValue([
      "bex_client_id",
      "client_id",
      "vip_client_id",
      "BEX_CLIENT_ID",
      "bex.vip.client_id",
    ]) || ""
  );
}

function getAccountLogin(): string {
  // NOTE: previously fell back to a hardcoded developer test account
  // number ("5047666801") when nothing was found in storage. That caused
  // every user without a connected MT5 account to silently register
  // their push token under someone else's account. Return "" instead so
  // the caller can detect "we don't know who this is" explicitly.
  return (
    readStorageValue([
      "bex_account_login",
      "account_login",
      "mt5_account_login",
      "BEX_ACCOUNT_LOGIN",
      "bex.vip.account_login",
    ]) || ""
  );
}

/**
 * True only when we have at least one real, stored identifier (client_id
 * or account_login) to attach this device's push token to. If this is
 * false, we must not register the push token at all — registering it
 * under no identifier (or worse, a fallback identifier) would silently
 * attach the token to the wrong account, as the old hardcoded fallback
 * values did.
 */
function hasUserOrAccountForPush(): boolean {
  return Boolean(getClientId() || getAccountLogin());
}

async function saveNativeToken(token: string) {
  const platform = Capacitor.getPlatform();
  const clientId = getClientId();
  const accountLogin = getAccountLogin();

  // Defense in depth: even if this function is ever called from another
  // code path in the future, never send a push-token registration that
  // has no real client_id and no real account_login. Doing so previously
  // meant the token got silently attached to a hardcoded fallback
  // account that did not belong to this user.
  if (!clientId && !accountLogin) {
    throw new Error("missing_user_or_account_for_push_registration");
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

    // Do not request permission or register for push at all if we have no
    // real identity (client_id / account_login) to attach the token to.
    // Previously this case silently fell through and registered the
    // token under a hardcoded developer account. Now we bail out early
    // with an explicit, callable-checkable reason instead.
    if (!hasUserOrAccountForPush()) {
      return {
        ok: false,
        native: true,
        reason: "missing_user_or_account_for_push_registration",
      };
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

