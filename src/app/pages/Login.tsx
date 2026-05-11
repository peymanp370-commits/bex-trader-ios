import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { Eye, EyeOff } from "lucide-react";
import logoImage from "../../assets/67578b6bc0297a415f1729364a3db485950c0551.png";

const AUTH_BASE =
  import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

const HISTORY_BASE =
  import.meta.env.VITE_MT5_HISTORY_API_URL ||
  import.meta.env.VITE_HISTORY_API_URL ||
  "https://bex-mt5-history-ingest.peymanp370.workers.dev";


type NativeAppleResponse = {
  response?: {
    identityToken?: string;
    identity_token?: string;
    idToken?: string;
    id_token?: string;
    authorizationCode?: string;
    authorization_code?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    user?: string;
  };
  identityToken?: string;
  identity_token?: string;
  idToken?: string;
  id_token?: string;
  authorizationCode?: string;
  authorization_code?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  user?: string;
};

type NativeGoogleResponse = {
  result?: any;
  authentication?: {
    idToken?: string | { token?: string };
    accessToken?: string | { token?: string };
  };
  idToken?: string | { token?: string };
  accessToken?: string | { token?: string };
  serverAuthCode?: string;
  authorizationCode?: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  profile?: {
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    imageUrl?: string;
  };
};

let nativeSocialLoginInitialized = false;

const initializeNativeSocialLogin = async () => {
  if (nativeSocialLoginInitialized) return;

  const isIOS = Capacitor.getPlatform() === "ios";

  await SocialLogin.initialize({
    google: isIOS
      ? {
          // Keep iOS initialization minimal. Passing extra web/server IDs can make
          // the native Google SDK choose the wrong flow and fail as "Load failed".
          iOSClientId: GOOGLE_IOS_CLIENT_ID,
          mode: "online",
        }
      : {
          webClientId: GOOGLE_WEB_CLIENT_ID,
          iOSClientId: GOOGLE_IOS_CLIENT_ID,
          iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
          mode: "online",
        },
    apple: {},
  } as any);

  nativeSocialLoginInitialized = true;
};

function tokenString(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value?.token === "string") return value.token.trim();
  if (typeof value?.jwt === "string") return value.jwt.trim();
  if (typeof value?.value === "string") return value.value.trim();
  if (typeof value?.raw === "string") return value.raw.trim();
  if (typeof value?.credential === "string") return value.credential.trim();
  if (typeof value?.accessToken === "string") return value.accessToken.trim();
  if (typeof value?.idToken === "string") return value.idToken.trim();
  if (typeof value?.identityToken === "string") return value.identityToken.trim();
  if (typeof value?.authorizationCode === "string") return value.authorizationCode.trim();
  if (typeof value?.serverAuthCode === "string") return value.serverAuthCode.trim();
  return "";
}

function isLikelyJwt(value: any): value is string {
  const s = tokenString(value);
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
}

function firstJwtDeep(value: any, depth = 0): string {
  if (!value || depth > 6) return "";
  const direct = tokenString(value);
  if (isLikelyJwt(direct)) return direct;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstJwtDeep(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const preferred = [
      "identityToken",
      "idToken",
      "id_token",
      "jwt",
      "token",
      "credential",
      "raw",
      "value",
      "authentication",
      "response",
      "result",
      "profile",
    ];
    for (const key of preferred) {
      if (key in value) {
        const found = firstJwtDeep(value[key], depth + 1);
        if (found) return found;
      }
    }
    for (const key of Object.keys(value)) {
      const found = firstJwtDeep(value[key], depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function firstTokenByKeys(value: any, keys: string[], depth = 0): string {
  if (!value || depth > 6) return "";
  if (typeof value !== "object") return "";
  for (const key of keys) {
    const v = tokenString(value?.[key]);
    if (v) return v;
  }
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const found = firstTokenByKeys(child, keys, depth + 1);
    if (found) return found;
  }
  return "";
}

const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "50746359348-l24lp3dj2m9plp7qc8godulthhdiaa6k.apps.googleusercontent.com";

const GOOGLE_IOS_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_NATIVE_CLIENT_ID ||
  "50746359348-j196c7embvnelnj7rfm2s35vdgbthvv6.apps.googleusercontent.com";

function makeOAuthValue(prefix: string) {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

type AppLanguage =
  | "en"
  | "fa"
  | "ar"
  | "es"
  | "pt-BR"
  | "hi"
  | "tr"
  | "de"
  | "fr"
  | "zh"
  | "ko";

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fa", label: "فارسی" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "hi", label: "हिन्दी" },
  { value: "tr", label: "Türkçe" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];


function normalizeLanguage(value: unknown): AppLanguage {
  const raw = String(value || "").trim();
  if (raw === "pt-BR") return "pt-BR";
  const lower = raw.toLowerCase();
  if (lower === "pt-br" || lower === "pt_br" || lower === "pt") return "pt-BR";
  if (lower.startsWith("fa")) return "fa";
  if (lower.startsWith("ar")) return "ar";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("tr")) return "tr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ko")) return "ko";
  return "en";
}

function getStoredLanguage(): AppLanguage {
  try {
    return normalizeLanguage(
      localStorage.getItem("userLanguage") ||
        localStorage.getItem("lang") ||
        localStorage.getItem("language") ||
        navigator.language
    );
  } catch {
    return "en";
  }
}

function saveLanguage(lang: AppLanguage) {
  try {
    localStorage.setItem("userLanguage", lang);
    localStorage.setItem("lang", lang);
    localStorage.setItem("language", lang);
    window.dispatchEvent(new CustomEvent("languageChange", { detail: { lang } }));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

function isRTL(lang: AppLanguage) {
  return lang === "fa" || lang === "ar";
}

function applyDocumentLanguage(lang: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  document.body.dir = document.documentElement.dir;
}

function tx(lang: AppLanguage, dict: Record<AppLanguage | "en", string>) {
  return dict[lang] || dict.en || "";
}

type AuthUser = {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  timezone?: string;
  country?: string;
  plan?: string;
  mt5_account_login?: string;
  account_login?: string;
  client_id?: string;
  vip_token?: string;
  vip_client?: {
    mt5_account_login?: string;
    account_login?: string;
    client_id?: string;
    token?: string;
  };
};


function saveAccountProfileToLocalStorage(profile: any) {
  const accountLogin = String(
    profile?.account_login ||
      profile?.mt5_account_login ||
      profile?.vip_client?.account_login ||
      profile?.vip_client?.mt5_account_login ||
      profile?.profile?.account_login ||
      profile?.profile?.mt5_account_login ||
      ""
  ).trim();

  const clientId = String(
    profile?.client_id ||
      profile?.vip_client?.client_id ||
      profile?.profile?.client_id ||
      ""
  ).trim();

  const vipToken = String(
    profile?.vip_token ||
      profile?.token ||
      profile?.vip_client?.token ||
      profile?.profile?.vip_token ||
      profile?.profile?.token ||
      ""
  ).trim();

  if (accountLogin) {
    localStorage.setItem("account_login", accountLogin);
    localStorage.setItem("mt5_account_login", accountLogin);
    localStorage.setItem("bex_account_login", accountLogin);
  }
  if (clientId) {
    localStorage.setItem("client_id", clientId);
    localStorage.setItem("bex_client_id", clientId);
  }
  if (vipToken) {
    localStorage.setItem("vip_token", vipToken);
    localStorage.setItem("bex_vip_token", vipToken);
  }
}

async function hydrateAccountProfile(emailOrIdentity: string) {
  const identity = String(emailOrIdentity || "").trim();
  if (!identity) return;

  const qs = new URLSearchParams();
  qs.set(identity.includes("@") ? "email" : "user_id", identity);

  try {
    const res = await fetch(`${HISTORY_BASE}/client-profile?${qs.toString()}`, {
      headers: { accept: "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok !== false) saveAccountProfileToLocalStorage(data?.profile || data);
  } catch {
    // Account page can retry later. Login must not fail because profile lookup failed.
  }
}

async function loginUser(payload: { identity: string; password: string }) {
  const res = await fetch(`${AUTH_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  return {
    ok: !!res.ok,
    message: data?.message || (res.ok ? "Login successful" : "Login failed"),
    user: (data?.user || null) as AuthUser | null,
  };
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.2-5.8 6.6l6.2 5.2C39 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-5 h-5 fill-white"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.466 2.19-1.174 2.953-.79.85-2.08 1.5-3.19 1.41-.14-1.08.39-2.23 1.11-2.99.79-.82 2.14-1.43 3.254-1.373zM20.94 17.09c-.56 1.28-.83 1.85-1.55 2.99-1 1.57-2.41 3.53-4.15 3.55-1.55.02-1.95-1.01-4.06-1-2.1.01-2.54 1.02-4.09.99-1.74-.03-3.07-1.79-4.07-3.36-2.8-4.28-3.1-9.31-1.37-11.97 1.22-1.88 3.16-2.98 4.98-2.98 1.86 0 3.03 1.03 4.57 1.03 1.5 0 2.42-1.03 4.56-1.03 1.62 0 3.34.88 4.56 2.4-4 2.2-3.35 7.93.07 9.38z" />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [lang, setLang] = useState<AppLanguage>(() => getStoredLanguage());
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState<"welcome" | "welcome_back">("welcome");

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const syncLanguage = () => setLang(getStoredLanguage());
    window.addEventListener("languageChange", syncLanguage as EventListener);
    window.addEventListener("storage", syncLanguage);
    return () => {
      window.removeEventListener("languageChange", syncLanguage as EventListener);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;

    CapacitorApp.addListener("appUrlOpen", async (event) => {
      const url = event?.url || "";

      try {
        await Browser.close();
      } catch {}

      setSocialLoading(null);

      if (url.includes("auth=success")) {
        await handleNativeAuthCallback(url);
        navigate("/app", { replace: true });
        return;
      }

      if (url.includes("error=")) {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("error") || "LOGIN_CANCELLED";
        setError(code);
        navigate(`/login?error=${encodeURIComponent(code)}`, { replace: true });
      }
    }).then((listener) => {
      removeListener = () => listener.remove();
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, [navigate]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    setTitle(mode === "welcome_back" ? "welcome_back" : "welcome");

    const oauthSuccess = searchParams.get("auth");
    if (oauthSuccess === "success") {
      setSocialLoading(null);
      void handleNativeAuthCallback(window.location.href).finally(() => {
        navigate("/app", { replace: true });
      });
      return;
    }

    const oauthError = searchParams.get("error");
    if (!oauthError) return;

    const errorMap: Record<string, Record<AppLanguage | "en", string>> = {
      GOOGLE_NOT_CONFIGURED: {
        en: "Google login is not configured.",
        fa: "ورود با گوگل تنظیم نشده است.",
        ar: "تسجيل الدخول عبر Google غير مُعد.",
        es: "El inicio de sesión con Google no está configurado.",
        "pt-BR": "O login com Google não está configurado.",
        hi: "Google लॉगिन कॉन्फ़िगर नहीं है।",
        tr: "Google ile giriş yapılandırılmamış.",
        de: "Google-Anmeldung ist nicht konfiguriert.",
        fr: "La connexion avec Google n’est pas configurée.",
        zh: "Google 登录尚未配置。",
        ko: "Google 로그인이 설정되지 않았습니다.",
      },
      GOOGLE_CODE_MISSING: {
        en: "Google login was cancelled or incomplete.",
        fa: "ورود با گوگل لغو شد یا کامل نشد.",
        ar: "تم إلغاء تسجيل الدخول عبر Google أو لم يكتمل.",
        es: "El inicio de sesión con Google fue cancelado o quedó incompleto.",
        "pt-BR": "O login com Google foi cancelado ou ficou incompleto.",
        hi: "Google लॉगिन रद्द हो गया या पूरा नहीं हुआ।",
        tr: "Google ile giriş iptal edildi veya tamamlanmadı.",
        de: "Google-Anmeldung wurde abgebrochen oder nicht abgeschlossen.",
        fr: "La connexion avec Google a été annulée ou incomplète.",
        zh: "Google 登录已取消或未完成。",
        ko: "Google 로그인이 취소되었거나 완료되지 않았습니다.",
      },
      GOOGLE_STATE_INVALID: {
        en: "Google login session expired. Please try again.",
        fa: "نشست ورود با گوگل منقضی شد. دوباره تلاش کنید.",
        ar: "انتهت جلسة تسجيل الدخول عبر Google. حاول مرة أخرى.",
        es: "La sesión de Google expiró. Inténtalo de nuevo.",
        "pt-BR": "A sessão do Google expirou. Tente novamente.",
        hi: "Google लॉगिन सत्र समाप्त हो गया। कृपया फिर कोशिश करें।",
        tr: "Google oturumu süresi doldu. Lütfen tekrar deneyin.",
        de: "Google-Anmeldesitzung ist abgelaufen. Bitte erneut versuchen.",
        fr: "La session Google a expiré. Veuillez réessayer.",
        zh: "Google 登录会话已过期，请重试。",
        ko: "Google 로그인 세션이 만료되었습니다. 다시 시도하세요.",
      },
      GOOGLE_TOKEN_EXCHANGE_FAILED: {
        en: "Google login failed. Please try again.",
        fa: "ورود با گوگل ناموفق بود. دوباره تلاش کنید.",
        ar: "فشل تسجيل الدخول عبر Google. حاول مرة أخرى.",
        es: "Falló el inicio de sesión con Google. Inténtalo de nuevo.",
        "pt-BR": "Falha no login com Google. Tente novamente.",
        hi: "Google लॉगिन विफल रहा। कृपया फिर कोशिश करें।",
        tr: "Google ile giriş başarısız oldu. Lütfen tekrar deneyin.",
        de: "Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
        fr: "La connexion avec Google a échoué. Veuillez réessayer.",
        zh: "Google 登录失败，请重试。",
        ko: "Google 로그인이 실패했습니다. 다시 시도하세요.",
      },
      GOOGLE_PROFILE_FAILED: {
        en: "Could not read your Google profile.",
        fa: "امکان خواندن پروفایل گوگل شما نبود.",
        ar: "تعذر قراءة ملفك الشخصي في Google.",
        es: "No se pudo leer tu perfil de Google.",
        "pt-BR": "Não foi possível ler seu perfil do Google.",
        hi: "आपकी Google प्रोफ़ाइल पढ़ी नहीं जा सकी।",
        tr: "Google profiliniz okunamadı.",
        de: "Ihr Google-Profil konnte nicht gelesen werden.",
        fr: "Impossible de lire votre profil Google.",
        zh: "无法读取您的 Google 个人资料。",
        ko: "Google 프로필을 읽을 수 없습니다.",
      },
      APPLE_NOT_CONFIGURED: {
        en: "Apple login is not configured.",
        fa: "ورود با اپل تنظیم نشده است.",
        ar: "تسجيل الدخول عبر Apple غير مُعد.",
        es: "El inicio de sesión con Apple no está configurado.",
        "pt-BR": "O login com Apple não está configurado.",
        hi: "Apple लॉगिन कॉन्फ़िगर नहीं है।",
        tr: "Apple ile giriş yapılandırılmamış.",
        de: "Apple-Anmeldung ist nicht konfiguriert.",
        fr: "La connexion avec Apple n’est pas configurée.",
        zh: "Apple 登录尚未配置。",
        ko: "Apple 로그인이 설정되지 않았습니다.",
      },
      APPLE_CALLBACK_MISSING_CODE: {
        en: "Apple login was cancelled or incomplete.",
        fa: "ورود با اپل لغو شد یا کامل نشد.",
        ar: "تم إلغاء تسجيل الدخول عبر Apple أو لم يكتمل.",
        es: "El inicio de sesión con Apple fue cancelado o quedó incompleto.",
        "pt-BR": "O login com Apple foi cancelado ou ficou incompleto.",
        hi: "Apple लॉगिन रद्द हो गया या पूरा नहीं हुआ।",
        tr: "Apple ile giriş iptal edildi veya tamamlanmadı.",
        de: "Apple-Anmeldung wurde abgebrochen oder nicht abgeschlossen.",
        fr: "La connexion avec Apple a été annulée ou incomplète.",
        zh: "Apple 登录已取消或未完成。",
        ko: "Apple 로그인이 취소되었거나 완료되지 않았습니다.",
      },
      APPLE_STATE_INVALID: {
        en: "Apple login session expired. Please try again.",
        fa: "نشست ورود با اپل منقضی شد. دوباره تلاش کنید.",
        ar: "انتهت جلسة تسجيل الدخول عبر Apple. حاول مرة أخرى.",
        es: "La sesión de Apple expiró. Inténtalo de nuevo.",
        "pt-BR": "A sessão da Apple expirou. Tente novamente.",
        hi: "Apple लॉगिन सत्र समाप्त हो गया। कृपया फिर कोशिश करें।",
        tr: "Apple oturumu süresi doldu. Lütfen tekrar deneyin.",
        de: "Apple-Anmeldesitzung ist abgelaufen. Bitte erneut versuchen.",
        fr: "La session Apple a expiré. Veuillez réessayer.",
        zh: "Apple 登录会话已过期，请重试。",
        ko: "Apple 로그인 세션이 만료되었습니다. 다시 시도하세요.",
      },
      APPLE_TOKEN_EXCHANGE_FAILED: {
        en: "Apple login failed. Please try again.",
        fa: "ورود با اپل ناموفق بود. دوباره تلاش کنید.",
        ar: "فشل تسجيل الدخول عبر Apple. حاول مرة أخرى.",
        es: "Falló el inicio de sesión con Apple. Inténtalo de nuevo.",
        "pt-BR": "Falha no login com Apple. Tente novamente.",
        hi: "Apple लॉगिन विफल रहा। कृपया फिर कोशिश करें।",
        tr: "Apple ile giriş başarısız oldu. Lütfen tekrar deneyin.",
        de: "Apple-Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
        fr: "La connexion avec Apple a échoué. Veuillez réessayer.",
        zh: "Apple 登录失败，请重试。",
        ko: "Apple 로그인이 실패했습니다. 다시 시도하세요.",
      },
      APPLE_ID_TOKEN_INVALID: {
        en: "Apple identity verification failed.",
        fa: "تأیید هویت اپل ناموفق بود.",
        ar: "فشل التحقق من هوية Apple.",
        es: "Falló la verificación de identidad de Apple.",
        "pt-BR": "Falha na verificação de identidade da Apple.",
        hi: "Apple पहचान सत्यापन विफल रहा।",
        tr: "Apple kimlik doğrulaması başarısız oldu.",
        de: "Apple-Identitätsprüfung fehlgeschlagen.",
        fr: "La vérification d’identité Apple a échoué.",
        zh: "Apple 身份验证失败。",
        ko: "Apple 신원 확인에 실패했습니다.",
      },
      APPLE_NONCE_INVALID: {
        en: "Apple login verification failed.",
        fa: "تأیید ورود با اپل ناموفق بود.",
        ar: "فشل التحقق من تسجيل الدخول عبر Apple.",
        es: "Falló la verificación de inicio de sesión con Apple.",
        "pt-BR": "Falha na verificação do login com Apple.",
        hi: "Apple लॉगिन सत्यापन विफल रहा।",
        tr: "Apple giriş doğrulaması başarısız oldu.",
        de: "Apple-Anmeldeprüfung fehlgeschlagen.",
        fr: "La vérification de connexion Apple a échoué.",
        zh: "Apple 登录验证失败。",
        ko: "Apple 로그인 확인에 실패했습니다.",
      },
      APPLE_SUB_MISSING: {
        en: "Apple account information is incomplete.",
        fa: "اطلاعات حساب اپل کامل نیست.",
        ar: "معلومات حساب Apple غير مكتملة.",
        es: "La información de la cuenta de Apple está incompleta.",
        "pt-BR": "As informações da conta Apple estão incompletas.",
        hi: "Apple खाते की जानकारी अधूरी है।",
        tr: "Apple hesap bilgileri eksik.",
        de: "Apple-Kontoinformationen sind unvollständig.",
        fr: "Les informations du compte Apple sont incomplètes.",
        zh: "Apple 账户信息不完整。",
        ko: "Apple 계정 정보가 불완전합니다.",
      },
    };

    setError(errorMap[oauthError] ? tx(lang, errorMap[oauthError]) : tx(lang, {
      en: "Login failed. Please try again.",
      fa: "ورود ناموفق بود. دوباره تلاش کنید.",
      ar: "فشل تسجيل الدخول. حاول مرة أخرى.",
      es: "Error al iniciar sesión. Inténtalo de nuevo.",
      "pt-BR": "Falha ao entrar. Tente novamente.",
      hi: "लॉगिन विफल रहा। कृपया फिर कोशिश करें।",
      tr: "Giriş başarısız oldu. Lütfen tekrar deneyin.",
      de: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
      fr: "La connexion a échoué. Veuillez réessayer.",
      zh: "登录失败，请重试。",
      ko: "로그인에 실패했습니다. 다시 시도하세요.",
    }));
    setSocialLoading(null);
  }, [searchParams, lang, navigate]);

  useEffect(() => {
    if (!loading && !socialLoading) return;

    const timer = window.setTimeout(() => {
      setLoading(false);
      setSocialLoading(null);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [loading, socialLoading]);

  const handleLanguageChange = (value: string) => {
    const nextLang = normalizeLanguage(value);
    setLang(nextLang);
    saveLanguage(nextLang);
    applyDocumentLanguage(nextLang);
  };

  const saveUserToLocalStorage = (resultUser: any, fallbackIdentity: string) => {
    const displayName =
      [resultUser?.first_name, resultUser?.last_name].filter(Boolean).join(" ").trim() ||
      resultUser?.first_name ||
      resultUser?.username ||
      resultUser?.email ||
      "Trader";

    localStorage.setItem(
      "userTimezone",
      resultUser?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "America/Toronto"
    );
    localStorage.setItem("userCountry", resultUser?.country || "Unknown");
    localStorage.setItem("userFirstName", resultUser?.first_name || "");
    localStorage.setItem("userLastName", resultUser?.last_name || "");
    localStorage.setItem("userEmail", resultUser?.email || fallbackIdentity);
    localStorage.setItem("userName", displayName);
    localStorage.setItem("userPlan", resultUser?.plan || "PRO");
    saveAccountProfileToLocalStorage(resultUser || {});
    window.dispatchEvent(new Event("storage"));
  };

  const handleNativeAuthCallback = async (rawUrl: string) => {
    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }

    const refreshToken = parsed.searchParams.get("refresh_token") || "";
    const email = parsed.searchParams.get("user_email") || "";
    const firstName = parsed.searchParams.get("user_first_name") || "";
    const lastName = parsed.searchParams.get("user_last_name") || "";
    const plan = parsed.searchParams.get("user_plan") || "free";

    if (refreshToken) {
      localStorage.setItem("bex_refresh_token", refreshToken);
      localStorage.setItem("refresh_token", refreshToken);
    }

    if (email || firstName || lastName || refreshToken) {
      const nativeUser = {
        email,
        first_name: firstName,
        last_name: lastName,
        plan,
      };
      saveUserToLocalStorage(nativeUser, email || "Trader");
      if (email) await hydrateAccountProfile(email);
      window.dispatchEvent(new Event("storage"));
      return true;
    }

    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanIdentity = identity.trim();

    if (!cleanIdentity || !password) {
      setError(tx(lang, {
        en: "Please enter your email/username and password.",
        fa: "لطفاً ایمیل/نام کاربری و رمز عبور را وارد کنید.",
        ar: "يرجى إدخال البريد الإلكتروني/اسم المستخدم وكلمة المرور.",
        es: "Introduce tu correo/usuario y contraseña.",
        "pt-BR": "Digite seu e-mail/usuário e senha.",
        hi: "कृपया अपना ईमेल/यूज़रनेम और पासवर्ड दर्ज करें।",
        tr: "Lütfen e-posta/kullanıcı adı ve şifrenizi girin.",
        de: "Bitte E-Mail/Benutzername und Passwort eingeben.",
        fr: "Veuillez saisir votre e-mail/nom d’utilisateur et votre mot de passe.",
        zh: "请输入邮箱/用户名和密码。",
        ko: "이메일/사용자 이름과 비밀번호를 입력하세요.",
      }));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginUser({
        identity: cleanIdentity,
        password,
      });

      if (!result.ok) {
        setError(result.message || tx(lang, {
          en: "Login failed",
          fa: "ورود ناموفق بود",
          ar: "فشل تسجيل الدخول",
          es: "Error al iniciar sesión",
          "pt-BR": "Falha ao entrar",
          hi: "लॉगिन विफल रहा",
          tr: "Giriş başarısız",
          de: "Anmeldung fehlgeschlagen",
          fr: "Échec de la connexion",
          zh: "登录失败",
          ko: "로그인 실패",
        }));
        return;
      }

      saveUserToLocalStorage(result.user, cleanIdentity);
      await hydrateAccountProfile(result.user?.email || cleanIdentity);
      navigate("/app");
    } catch {
      setError(tx(lang, {
        en: "Failed to login",
        fa: "ورود انجام نشد",
        ar: "تعذر تسجيل الدخول",
        es: "No se pudo iniciar sesión",
        "pt-BR": "Não foi possível entrar",
        hi: "लॉगिन नहीं हो सका",
        tr: "Giriş yapılamadı",
        de: "Anmeldung fehlgeschlagen",
        fr: "Impossible de se connecter",
        zh: "无法登录",
        ko: "로그인할 수 없습니다",
      }));
    } finally {
      setLoading(false);
    }
  };

  const clearStoredAuthUser = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPlan");
    window.dispatchEvent(new Event("storage"));
  };

  const exchangeNativeAppleToken = async (appleResult: NativeAppleResponse, state: string, nonce: string) => {
    const root: any = (appleResult as any)?.result || appleResult || {};
    const response: any = root?.response || (appleResult as any)?.response || root || {};
    const profile: any = root?.profile || response?.profile || (appleResult as any)?.profile || {};
    const accessToken: any = root?.accessToken || response?.accessToken || (appleResult as any)?.accessToken || null;

    // IMPORTANT: with @capgo/capacitor-social-login Apple, accessToken.token is often
    // the Apple authorization code, not a JWT. The previous extractor searched the whole
    // object and could accidentally send that code as identity_token, causing backend
    // jose jwtVerify to throw ERR_JWS_INVALID. Only accept explicit idToken/identityToken
    // fields as the Apple identity JWT.
    const accessTokenString = tokenString(accessToken?.token) || tokenString(accessToken) || "";

    const explicitIdentityToken =
      tokenString(response.identityToken) ||
      tokenString(response.idToken) ||
      tokenString(response.id_token) ||
      tokenString(root.identityToken) ||
      tokenString(root.idToken) ||
      tokenString(root.id_token) ||
      tokenString((appleResult as any)?.identityToken) ||
      tokenString((appleResult as any)?.idToken) ||
      tokenString((appleResult as any)?.id_token) ||
      (isLikelyJwt(accessTokenString) ? accessTokenString : "") ||
      firstJwtDeep(appleResult) ||
      "";

    const identityToken = isLikelyJwt(explicitIdentityToken) ? explicitIdentityToken : "";

    const explicitAuthorizationCode =
      tokenString(response.authorizationCode) ||
      tokenString(response.authorization_code) ||
      tokenString(response.code) ||
      tokenString(response.authCode) ||
      tokenString(root.authorizationCode) ||
      tokenString(root.authorization_code) ||
      tokenString(root.code) ||
      tokenString(root.authCode) ||
      (!isLikelyJwt(accessTokenString) ? accessTokenString : "") ||
      firstTokenByKeys(appleResult, [
        "authorizationCode",
        "authorization_code",
        "code",
        "authCode",
        "serverAuthCode",
      ]) || "";

    const authorizationCode = isLikelyJwt(explicitAuthorizationCode) ? "" : explicitAuthorizationCode;

    const email = response.email || root.email || profile.email || "";
    const firstName = response.givenName || response.given_name || root.givenName || root.given_name || profile.givenName || profile.given_name || "";
    const lastName = response.familyName || response.family_name || root.familyName || root.family_name || profile.familyName || profile.family_name || "";
    const appleUserId = response.user || root.user || root.userId || root.user_id || profile.user || "";

    // Do not fail on-device before the backend sees the full native payload.
    // Some iOS/@capgo Apple responses nest the useful credential deeper than
    // response/root/accessToken. The worker now receives raw_apple_result and
    // can extract identity_token or authorization_code server-side.
    if (!identityToken && !authorizationCode) {
      console.warn("Apple native response had no top-level token; sending raw payload to backend", appleResult);
    }

    const res = await fetch(`${AUTH_BASE}/auth/apple/native`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_token: identityToken,
        id_token: identityToken,
        authorization_code: authorizationCode,
        code: authorizationCode,
        email,
        first_name: firstName,
        last_name: lastName,
        apple_user_id: appleUserId,
        user: appleUserId,
        state,
        nonce,
        raw_apple_result: appleResult,
        platform: "ios",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.code || data?.message || "APPLE_TOKEN_EXCHANGE_FAILED");
    }

    if (data?.refresh_token) {
      localStorage.setItem("bex_refresh_token", data.refresh_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    }

    const user = data?.user || {
      email,
      first_name: firstName,
      last_name: lastName,
      plan: data?.plan || "free",
    };

    saveUserToLocalStorage(user, user?.email || email || "Trader");
    await hydrateAccountProfile(user?.email || email || appleUserId);
    window.dispatchEvent(new Event("storage"));
    navigate("/app", { replace: true });
  };

  const handleNativeAppleSignIn = async () => {
    setError("");
    setSocialLoading("apple");
    clearStoredAuthUser();

    const state = makeOAuthValue("apple_state");
    const nonce = makeOAuthValue("apple_nonce");

    try {
      // IMPORTANT:
      // Apple uses @capacitor-community/apple-sign-in.
      // Google stays on @capgo/capacitor-social-login.
      // Do NOT call SocialLogin.login({ provider: "apple" }) here.
      const appleResult: any = await SignInWithApple.authorize({
        clientId: "com.bextrader.web",
        redirectURI: "https://auth.bextrader.com/auth/apple/callback",
        scopes: "email name",
        state,
        nonce,
      } as any);

      const response: any = appleResult?.response || appleResult || {};

      const identityToken =
        tokenString(response.identityToken) ||
        tokenString(response.identity_token) ||
        tokenString(response.idToken) ||
        tokenString(response.id_token) ||
        tokenString(appleResult?.identityToken) ||
        tokenString(appleResult?.identity_token) ||
        tokenString(appleResult?.idToken) ||
        tokenString(appleResult?.id_token) ||
        firstJwtDeep(appleResult);

      if (!identityToken || !isLikelyJwt(identityToken)) {
        console.error("Apple community plugin response without identityToken JWT", appleResult);
        throw new Error("APPLE_COMMUNITY_IDENTITY_TOKEN_MISSING");
      }

      const normalizedAppleResult: NativeAppleResponse = {
        response: {
          identityToken,
          authorizationCode:
            tokenString(response.authorizationCode) ||
            tokenString(response.authorization_code) ||
            tokenString(response.code) ||
            tokenString(appleResult?.authorizationCode) ||
            tokenString(appleResult?.authorization_code) ||
            tokenString(appleResult?.code) ||
            "",
          email: response.email || appleResult?.email || "",
          givenName: response.givenName || response.given_name || appleResult?.givenName || appleResult?.given_name || "",
          familyName: response.familyName || response.family_name || appleResult?.familyName || appleResult?.family_name || "",
          user: response.user || appleResult?.user || "",
        },
        identityToken,
        authorizationCode:
          tokenString(response.authorizationCode) ||
          tokenString(response.authorization_code) ||
          tokenString(response.code) ||
          tokenString(appleResult?.authorizationCode) ||
          tokenString(appleResult?.authorization_code) ||
          tokenString(appleResult?.code) ||
          "",
        email: response.email || appleResult?.email || "",
        givenName: response.givenName || response.given_name || appleResult?.givenName || appleResult?.given_name || "",
        familyName: response.familyName || response.family_name || appleResult?.familyName || appleResult?.family_name || "",
        user: response.user || appleResult?.user || "",
      };

      await exchangeNativeAppleToken(normalizedAppleResult, state, nonce);
    } catch (err: any) {
      console.error("Apple native sign-in failed", err);
      const code = String(err?.message || err?.code || "APPLE_TOKEN_EXCHANGE_FAILED");
      setError(tx(lang, {
        en: code.includes("cancel") || code.includes("CANCEL") ? "Apple sign-in was cancelled." : `Apple sign-in failed: ${code}`,
        fa: code.includes("cancel") || code.includes("CANCEL") ? "ورود با اپل لغو شد." : `ورود با اپل ناموفق بود: ${code}`,
        ar: code.includes("cancel") || code.includes("CANCEL") ? "تم إلغاء تسجيل الدخول عبر Apple." : "فشل تسجيل الدخول عبر Apple. حاول مرة أخرى.",
        es: code.includes("cancel") || code.includes("CANCEL") ? "El inicio con Apple fue cancelado." : "Falló el inicio de sesión con Apple. Inténtalo de nuevo.",
        "pt-BR": code.includes("cancel") || code.includes("CANCEL") ? "O login com Apple foi cancelado." : "Falha no login com Apple. Tente novamente.",
        hi: code.includes("cancel") || code.includes("CANCEL") ? "Apple साइन-इन रद्द हो गया।" : "Apple लॉगिन विफल रहा। कृपया फिर कोशिश करें।",
        tr: code.includes("cancel") || code.includes("CANCEL") ? "Apple ile giriş iptal edildi." : "Apple ile giriş başarısız oldu. Lütfen tekrar deneyin.",
        de: code.includes("cancel") || code.includes("CANCEL") ? "Apple-Anmeldung wurde abgebrochen." : "Apple-Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
        fr: code.includes("cancel") || code.includes("CANCEL") ? "La connexion Apple a été annulée." : "La connexion avec Apple a échoué. Veuillez réessayer.",
        zh: code.includes("cancel") || code.includes("CANCEL") ? "Apple 登录已取消。" : "Apple 登录失败，请重试。",
        ko: code.includes("cancel") || code.includes("CANCEL") ? "Apple 로그인이 취소되었습니다." : "Apple 로그인이 실패했습니다. 다시 시도하세요.",
      }));
    } finally {
      setSocialLoading(null);
    }
  };

  const exchangeNativeGoogleToken = async (googleResult: NativeGoogleResponse) => {
    const root: any = (googleResult as any)?.result || googleResult || {};
    const auth: any = root?.authentication || (googleResult as any)?.authentication || {};
    const profile: any = root?.profile || (googleResult as any)?.profile || {};

    // Capgo returns different shapes between versions/platforms.
    // Handle flat values, nested result values, and token objects like { token: "..." }.
    const idToken =
      firstJwtDeep(root?.idToken) ||
      firstJwtDeep(root?.id_token) ||
      firstJwtDeep(auth?.idToken) ||
      firstJwtDeep(auth?.id_token) ||
      firstJwtDeep((googleResult as any)?.idToken) ||
      firstJwtDeep(googleResult);

    const accessToken =
      tokenString(root?.accessToken) ||
      tokenString(root?.access_token) ||
      tokenString(auth?.accessToken) ||
      tokenString(auth?.access_token) ||
      tokenString((googleResult as any)?.accessToken) ||
      firstTokenByKeys(googleResult, ["accessToken", "access_token"]);

    const serverAuthCode =
      tokenString(root?.serverAuthCode) ||
      tokenString(root?.authorizationCode) ||
      tokenString(root?.server_auth_code) ||
      tokenString((googleResult as any)?.serverAuthCode) ||
      tokenString((googleResult as any)?.authorizationCode) ||
      firstTokenByKeys(googleResult, ["serverAuthCode", "server_auth_code", "authorizationCode", "authorization_code", "code"]);

    const email = root?.email || profile.email || (googleResult as any)?.email || "";
    const firstName = root?.givenName || root?.given_name || profile.givenName || profile.given_name || (googleResult as any)?.givenName || "";
    const lastName = root?.familyName || root?.family_name || profile.familyName || profile.family_name || (googleResult as any)?.familyName || "";
    const name = root?.name || profile.name || (googleResult as any)?.name || "";

    if (!idToken && !accessToken && !serverAuthCode) {
      console.error("Google native response without token", googleResult);
      throw new Error("GOOGLE_NATIVE_MISSING_TOKEN");
    }

    const res = await fetch(`${AUTH_BASE}/auth/google/native`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: idToken,
        access_token: accessToken,
        server_auth_code: serverAuthCode,
        email,
        first_name: firstName,
        last_name: lastName,
        name,
        platform: Capacitor.getPlatform(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.code || data?.message || "GOOGLE_NATIVE_EXCHANGE_FAILED");
    }

    if (data?.refresh_token) {
      localStorage.setItem("bex_refresh_token", data.refresh_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    }

    const user = data?.user || {
      email,
      first_name: firstName || name?.split(" ")?.[0] || "Google",
      last_name: lastName || name?.split(" ")?.slice(1).join(" ") || "User",
      plan: data?.plan || "free",
    };

    saveUserToLocalStorage(user, user?.email || email || "Trader");
    await hydrateAccountProfile(user?.email || email);
    window.dispatchEvent(new Event("storage"));
    navigate("/app", { replace: true });
  };

  const handleNativeGoogleSignIn = async () => {
    setError("");
    setSocialLoading("google");
    clearStoredAuthUser();

    try {
      await initializeNativeSocialLogin();

      try {
        await SocialLogin.logout({ provider: "google" } as any);
      } catch {}

      const googleResult = await SocialLogin.login({
        provider: "google",
        options: {},
      } as any) as NativeGoogleResponse;

      await exchangeNativeGoogleToken(googleResult);
    } catch (err: any) {
      console.error("Google native sign-in failed", err);
      const code = String(err?.message || err?.code || "GOOGLE_NATIVE_SIGNIN_FAILED");
      setError(tx(lang, {
        en: code.includes("cancel") || code.includes("CANCEL") ? "Google sign-in was cancelled." : `Google native sign-in failed: ${code}`,
        fa: code.includes("cancel") || code.includes("CANCEL") ? "ورود با گوگل لغو شد." : `ورود native گوگل ناموفق بود: ${code}`,
        ar: code.includes("cancel") || code.includes("CANCEL") ? "تم إلغاء تسجيل الدخول عبر Google." : "فشل تسجيل الدخول الأصلي عبر Google. تحقق من Google iOS Client ID وحاول مرة أخرى.",
        es: code.includes("cancel") || code.includes("CANCEL") ? "El inicio con Google fue cancelado." : "Falló el inicio nativo con Google. Revisa el Google iOS Client ID e inténtalo de nuevo.",
        "pt-BR": code.includes("cancel") || code.includes("CANCEL") ? "O login com Google foi cancelado." : "Falha no login nativo com Google. Verifique o Google iOS Client ID e tente novamente.",
        hi: code.includes("cancel") || code.includes("CANCEL") ? "Google साइन-इन रद्द हो गया।" : "Google native login विफल रहा। Google iOS Client ID चेक करें और फिर कोशिश करें।",
        tr: code.includes("cancel") || code.includes("CANCEL") ? "Google ile giriş iptal edildi." : "Google native giriş başarısız oldu. Google iOS Client ID değerini kontrol edin ve tekrar deneyin.",
        de: code.includes("cancel") || code.includes("CANCEL") ? "Google-Anmeldung wurde abgebrochen." : "Native Google-Anmeldung fehlgeschlagen. Prüfe die Google iOS Client ID und versuche es erneut.",
        fr: code.includes("cancel") || code.includes("CANCEL") ? "La connexion Google a été annulée." : "La connexion native Google a échoué. Vérifiez le Google iOS Client ID puis réessayez.",
        zh: code.includes("cancel") || code.includes("CANCEL") ? "Google 登录已取消。" : "Google 原生登录失败。请检查 Google iOS Client ID 后重试。",
        ko: code.includes("cancel") || code.includes("CANCEL") ? "Google 로그인이 취소되었습니다." : "Google 네이티브 로그인이 실패했습니다. Google iOS Client ID를 확인하고 다시 시도하세요.",
      }));
    } finally {
      setSocialLoading(null);
    }
  };

  const openSocialAuth = async (provider: "google" | "apple") => {
    if (provider === "apple" && Capacitor.getPlatform() === "ios") {
      await handleNativeAppleSignIn();
      return;
    }

    if (provider === "google" && Capacitor.getPlatform() === "ios") {
      await handleNativeGoogleSignIn();
      return;
    }

    setError("");
    setSocialLoading(provider);
    clearStoredAuthUser();

    const authUrl = new URL(`${AUTH_BASE}/auth/${provider}/start`);
    const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
    authUrl.searchParams.set("platform", platform === "ios" ? "ios" : platform === "android" ? "android" : "web");
    const url = authUrl.toString();

    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({
          url,
          presentationStyle: "fullscreen",
        });
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error(`${provider} sign-in failed`, err);
      setSocialLoading(null);
      setError(tx(lang, {
        en: `${provider === "google" ? "Google" : "Apple"} login failed. Please try again.`,
        fa: `ورود با ${provider === "google" ? "گوگل" : "اپل"} ناموفق بود. دوباره تلاش کنید.`,
        ar: `فشل تسجيل الدخول عبر ${provider === "google" ? "Google" : "Apple"}. حاول مرة أخرى.`,
        es: `Falló el inicio de sesión con ${provider === "google" ? "Google" : "Apple"}. Inténtalo de nuevo.`,
        "pt-BR": `Falha no login com ${provider === "google" ? "Google" : "Apple"}. Tente novamente.`,
        hi: `${provider === "google" ? "Google" : "Apple"} लॉगिन विफल रहा। कृपया फिर कोशिश करें।`,
        tr: `${provider === "google" ? "Google" : "Apple"} ile giriş başarısız oldu. Lütfen tekrar deneyin.`,
        de: `${provider === "google" ? "Google" : "Apple"}-Anmeldung fehlgeschlagen. Bitte erneut versuchen.`,
        fr: `La connexion avec ${provider === "google" ? "Google" : "Apple"} a échoué. Veuillez réessayer.`,
        zh: `${provider === "google" ? "Google" : "Apple"} 登录失败，请重试。`,
        ko: `${provider === "google" ? "Google" : "Apple"} 로그인이 실패했습니다. 다시 시도하세요.`,
      }));
    }
  };

  const handleGoogleSignIn = () => openSocialAuth("google");

  const handleAppleSignIn = () => openSocialAuth("apple");

  const rtl = isRTL(lang);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md" dir={rtl ? "rtl" : "ltr"} lang={lang}>
        <div className="mb-4 flex justify-end">
          <select
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="max-h-48 rounded-xl border border-gray-700 bg-[#1a2332] px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            aria-label={tx(lang, {
              en: "Language",
              fa: "زبان",
              ar: "اللغة",
              es: "Idioma",
              "pt-BR": "Idioma",
              hi: "भाषा",
              tr: "Dil",
              de: "Sprache",
              fr: "Langue",
              zh: "语言",
              ko: "언어",
            })}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center mb-6">
          <img
            src={logoImage}
            alt="BEX"
            className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-3xl font-bold mb-2">
            {title === "welcome_back"
              ? tx(lang, {
                  en: "Welcome Back",
                  fa: "خوش آمدید دوباره",
                  ar: "مرحبًا بعودتك",
                  es: "Bienvenido de nuevo",
                  "pt-BR": "Bem-vindo de volta",
                  hi: "वापसी पर स्वागत है",
                  tr: "Tekrar hoş geldiniz",
                  de: "Willkommen zurück",
                  fr: "Bon retour",
                  zh: "欢迎回来",
                  ko: "다시 오신 것을 환영합니다",
                })
              : tx(lang, {
                  en: "Welcome",
                  fa: "خوش آمدید",
                  ar: "مرحبًا",
                  es: "Bienvenido",
                  "pt-BR": "Bem-vindo",
                  hi: "स्वागत है",
                  tr: "Hoş geldiniz",
                  de: "Willkommen",
                  fr: "Bienvenue",
                  zh: "欢迎",
                  ko: "환영합니다",
                })}
          </h1>
          <p className="text-gray-400">
            {tx(lang, {
              en: "Sign in to BEX Trader",
              fa: "ورود به BEX Trader",
              ar: "تسجيل الدخول إلى BEX Trader",
              es: "Inicia sesión en BEX Trader",
              "pt-BR": "Entre no BEX Trader",
              hi: "BEX Trader में साइन इन करें",
              tr: "BEX Trader’a giriş yapın",
              de: "Bei BEX Trader anmelden",
              fr: "Connectez-vous à BEX Trader",
              zh: "登录 BEX Trader",
              ko: "BEX Trader에 로그인",
            })}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tx(lang, {
                en: "Email or Username",
                fa: "ایمیل یا نام کاربری",
                ar: "البريد الإلكتروني أو اسم المستخدم",
                es: "Correo o usuario",
                "pt-BR": "E-mail ou usuário",
                hi: "ईमेल या यूज़रनेम",
                tr: "E-posta veya kullanıcı adı",
                de: "E-Mail oder Benutzername",
                fr: "E-mail ou nom d’utilisateur",
                zh: "邮箱或用户名",
                ko: "이메일 또는 사용자 이름",
              })}
            </label>
            <input
              type="text"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              className="w-full bg-[#1a2332] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              placeholder={tx(lang, {
                en: "Enter email or username",
                fa: "ایمیل یا نام کاربری را وارد کنید",
                ar: "أدخل البريد الإلكتروني أو اسم المستخدم",
                es: "Introduce correo o usuario",
                "pt-BR": "Digite e-mail ou usuário",
                hi: "ईमेल या यूज़रनेम दर्ज करें",
                tr: "E-posta veya kullanıcı adı girin",
                de: "E-Mail oder Benutzername eingeben",
                fr: "Entrez e-mail ou nom d’utilisateur",
                zh: "输入邮箱或用户名",
                ko: "이메일 또는 사용자 이름 입력",
              })}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tx(lang, {
                en: "Password",
                fa: "رمز عبور",
                ar: "كلمة المرور",
                es: "Contraseña",
                "pt-BR": "Senha",
                hi: "पासवर्ड",
                tr: "Şifre",
                de: "Passwort",
                fr: "Mot de passe",
                zh: "密码",
                ko: "비밀번호",
              })}
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-[#1a2332] border border-gray-700 rounded-xl px-4 py-3 ${rtl ? "pl-12" : "pr-12"} text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20`}
                placeholder={tx(lang, {
                  en: "Enter your password",
                  fa: "رمز عبور خود را وارد کنید",
                  ar: "أدخل كلمة المرور",
                  es: "Introduce tu contraseña",
                  "pt-BR": "Digite sua senha",
                  hi: "अपना पासवर्ड दर्ज करें",
                  tr: "Şifrenizi girin",
                  de: "Passwort eingeben",
                  fr: "Entrez votre mot de passe",
                  zh: "输入您的密码",
                  ko: "비밀번호를 입력하세요",
                })}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute inset-y-0 ${rtl ? "left-0" : "right-0"} px-4 flex items-center text-gray-400 hover:text-white`}
                aria-label={showPassword ? tx(lang, {
                  en: "Hide password",
                  fa: "مخفی کردن رمز عبور",
                  ar: "إخفاء كلمة المرور",
                  es: "Ocultar contraseña",
                  "pt-BR": "Ocultar senha",
                  hi: "पासवर्ड छिपाएँ",
                  tr: "Şifreyi gizle",
                  de: "Passwort ausblenden",
                  fr: "Masquer le mot de passe",
                  zh: "隐藏密码",
                  ko: "비밀번호 숨기기",
                }) : tx(lang, {
                  en: "Show password",
                  fa: "نمایش رمز عبور",
                  ar: "إظهار كلمة المرور",
                  es: "Mostrar contraseña",
                  "pt-BR": "Mostrar senha",
                  hi: "पासवर्ड दिखाएँ",
                  tr: "Şifreyi göster",
                  de: "Passwort anzeigen",
                  fr: "Afficher le mot de passe",
                  zh: "显示密码",
                  ko: "비밀번호 표시",
                })}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className={`mt-2 ${rtl ? "text-left" : "text-right"}`}>
              <Link
                to="/forgot-password"
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors"
              >
                {tx(lang, {
                  en: "Forgot password?",
                  fa: "فراموشی رمز عبور؟",
                  ar: "هل نسيت كلمة المرور؟",
                  es: "¿Olvidaste tu contraseña?",
                  "pt-BR": "Esqueceu a senha?",
                  hi: "पासवर्ड भूल गए?",
                  tr: "Şifrenizi mi unuttunuz?",
                  de: "Passwort vergessen?",
                  fr: "Mot de passe oublié ?",
                  zh: "忘记密码？",
                  ko: "비밀번호를 잊으셨나요?",
                })}
              </Link>
            </div>
          </div>

          <p className={`text-center text-xs leading-relaxed text-gray-400 ${rtl ? "text-right" : "text-center"}`}>
            {tx(lang, {
              en: "By continuing, you confirm you are 18+ and agree to our ",
              fa: "با ادامه دادن، تأیید می‌کنید که ۱۸ سال یا بیشتر دارید و با ",
              ar: "بالمتابعة، تؤكد أن عمرك 18 عامًا أو أكثر وتوافق على ",
              es: "Al continuar, confirmas que tienes 18 años o más y aceptas nuestros ",
              "pt-BR": "Ao continuar, você confirma que tem 18 anos ou mais e concorda com nossos ",
              hi: "जारी रखकर, आप पुष्टि करते हैं कि आपकी आयु 18+ है और आप हमारी ",
              tr: "Devam ederek 18 yaşında veya daha büyük olduğunuzu ve ",
              de: "Wenn Sie fortfahren, bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und unseren ",
              fr: "En continuant, vous confirmez avoir 18 ans ou plus et accepter nos ",
              zh: "继续即表示您确认已年满 18 岁，并同意我们的",
              ko: "계속하면 만 18세 이상이며 다음에 동의하는 것으로 간주됩니다: ",
            })}
            <Link to="/terms" className="font-semibold text-yellow-400 hover:text-yellow-300 underline underline-offset-4">
              {tx(lang, {
                en: "Terms of Service",
                fa: "قوانین استفاده",
                ar: "شروط الخدمة",
                es: "Términos de Servicio",
                "pt-BR": "Termos de Serviço",
                hi: "सेवा की शर्तों",
                tr: "Hizmet Şartları",
                de: "Nutzungsbedingungen",
                fr: "Conditions d’utilisation",
                zh: "服务条款",
                ko: "서비스 약관",
              })}
            </Link>
            {tx(lang, {
              en: " and ",
              fa: " و ",
              ar: " و ",
              es: " y ",
              "pt-BR": " e ",
              hi: " और ",
              tr: " ve ",
              de: " und ",
              fr: " et notre ",
              zh: "和",
              ko: " 및 ",
            })}
            <Link to="/privacy" className="font-semibold text-yellow-400 hover:text-yellow-300 underline underline-offset-4">
              {tx(lang, {
                en: "Privacy Policy",
                fa: "سیاست حریم خصوصی",
                ar: "سياسة الخصوصية",
                es: "Política de Privacidad",
                "pt-BR": "Política de Privacidade",
                hi: "गोपनीयता नीति",
                tr: "Gizlilik Politikası",
                de: "Datenschutzrichtlinie",
                fr: "Politique de confidentialité",
                zh: "隐私政策",
                ko: "개인정보 처리방침",
              })}
            </Link>
            {tx(lang, {
              en: ". Trading involves risk.",
              fa: " موافق هستید. معامله‌گری ریسک دارد.",
              ar: ". التداول ينطوي على مخاطر.",
              es: ". Operar implica riesgo.",
              "pt-BR": ". Trading envolve risco.",
              hi: " से सहमत हैं। ट्रेडिंग में जोखिम है।",
              tr: " kabul etmiş olursunuz. İşlem yapmak risk içerir.",
              de: " zustimmen. Trading ist mit Risiken verbunden.",
              fr: ". Le trading comporte des risques.",
              zh: "。交易存在风险。",
              ko: "에 동의합니다. 거래에는 위험이 있습니다.",
            })}
          </p>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/40 transition-all disabled:opacity-50"
          >
            {loading
              ? tx(lang, {
                  en: "Logging in...",
                  fa: "در حال ورود...",
                  ar: "جارٍ تسجيل الدخول...",
                  es: "Iniciando sesión...",
                  "pt-BR": "Entrando...",
                  hi: "लॉगिन हो रहा है...",
                  tr: "Giriş yapılıyor...",
                  de: "Anmeldung läuft...",
                  fr: "Connexion...",
                  zh: "正在登录...",
                  ko: "로그인 중...",
                })
              : tx(lang, {
                  en: "Login",
                  fa: "ورود",
                  ar: "تسجيل الدخول",
                  es: "Iniciar sesión",
                  "pt-BR": "Entrar",
                  hi: "लॉगिन",
                  tr: "Giriş yap",
                  de: "Anmelden",
                  fr: "Connexion",
                  zh: "登录",
                  ko: "로그인",
                })}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0a0e1a] px-4 text-sm text-gray-400">
                {tx(lang, {
                  en: "or continue with",
                  fa: "یا ادامه دهید با",
                  ar: "أو تابع باستخدام",
                  es: "o continúa con",
                  "pt-BR": "ou continue com",
                  hi: "या जारी रखें",
                  tr: "veya şununla devam et",
                  de: "oder fortfahren mit",
                  fr: "ou continuer avec",
                  zh: "或继续使用",
                  ko: "또는 다음으로 계속",
                })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || socialLoading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-semibold hover:opacity-95 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              <span>
                {socialLoading === "google"
                  ? tx(lang, {
                      en: "Opening secure Google sign-in...",
                      fa: "در حال باز کردن ورود امن گوگل...",
                      ar: "جارٍ فتح تسجيل الدخول الآمن عبر Google...",
                      es: "Abriendo inicio seguro con Google...",
                      "pt-BR": "Abrindo login seguro com Google...",
                      hi: "सुरक्षित Google साइन-इन खुल रहा है...",
                      tr: "Güvenli Google girişi açılıyor...",
                      de: "Sichere Google-Anmeldung wird geöffnet...",
                      fr: "Ouverture de la connexion Google sécurisée...",
                      zh: "正在打开安全 Google 登录...",
                      ko: "보안 Google 로그인을 여는 중...",
                    })
                  : tx(lang, {
                      en: "Continue with Google",
                      fa: "ادامه با گوگل",
                      ar: "المتابعة باستخدام Google",
                      es: "Continuar con Google",
                      "pt-BR": "Continuar com Google",
                      hi: "Google के साथ जारी रखें",
                      tr: "Google ile devam et",
                      de: "Mit Google fortfahren",
                      fr: "Continuer avec Google",
                      zh: "使用 Google 继续",
                      ko: "Google로 계속",
                    })}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading || socialLoading === "google"}
              className="w-full flex items-center justify-center gap-3 bg-black text-white border border-gray-700 py-3 rounded-xl font-semibold hover:border-gray-500 transition-all disabled:opacity-50"
            >
              <AppleIcon />
              <span>
                {socialLoading === "apple"
                  ? tx(lang, {
                      en: "Opening Apple sign-in...",
                      fa: "در حال باز کردن ورود با اپل...",
                      ar: "جارٍ فتح تسجيل الدخول عبر Apple...",
                      es: "Abriendo inicio con Apple...",
                      "pt-BR": "Abrindo login com Apple...",
                      hi: "Apple साइन-इन खुल रहा है...",
                      tr: "Apple girişi açılıyor...",
                      de: "Apple-Anmeldung wird geöffnet...",
                      fr: "Ouverture de la connexion Apple...",
                      zh: "正在打开 Apple 登录...",
                      ko: "Apple 로그인을 여는 중...",
                    })
                  : tx(lang, {
                      en: "Continue with Apple",
                      fa: "ادامه با اپل",
                      ar: "المتابعة باستخدام Apple",
                      es: "Continuar con Apple",
                      "pt-BR": "Continuar com Apple",
                      hi: "Apple के साथ जारी रखें",
                      tr: "Apple ile devam et",
                      de: "Mit Apple fortfahren",
                      fr: "Continuer avec Apple",
                      zh: "使用 Apple 继续",
                      ko: "Apple로 계속",
                    })}
              </span>
            </button>
          </div>

          <div className="text-center pt-1">
            <span className="text-gray-400 text-sm">
              {tx(lang, {
                en: "Don’t have an account?",
                fa: "حساب ندارید؟",
                ar: "ليس لديك حساب؟",
                es: "¿No tienes una cuenta?",
                "pt-BR": "Não tem uma conta?",
                hi: "खाता नहीं है?",
                tr: "Hesabınız yok mu?",
                de: "Noch kein Konto?",
                fr: "Vous n’avez pas de compte ?",
                zh: "还没有账户？",
                ko: "계정이 없으신가요?",
              })}{" "}
            </span>
            <Link
              to="/register"
              className="text-yellow-400 text-sm font-medium hover:text-yellow-300"
            >
              {tx(lang, {
                en: "Register Now",
                fa: "همین حالا ثبت‌نام کنید",
                ar: "سجّل الآن",
                es: "Regístrate ahora",
                "pt-BR": "Cadastre-se agora",
                hi: "अभी रजिस्टर करें",
                tr: "Şimdi kayıt ol",
                de: "Jetzt registrieren",
                fr: "S’inscrire maintenant",
                zh: "立即注册",
                ko: "지금 가입하기",
              })}
            </Link>
          </div>

          <p className="text-center text-xs text-gray-500 pt-2">
            {tx(lang, {
              en: "BEX Trader is not financial advice. Trading gold, silver, forex, CFDs, and leveraged products involves risk.",
              fa: "BEX Trader توصیه مالی نیست. معامله طلا، نقره، فارکس، CFD و محصولات اهرمی ریسک دارد.",
              ar: "BEX Trader ليس نصيحة مالية. تداول الذهب والفضة والفوركس وCFD والمنتجات ذات الرافعة ينطوي على مخاطر.",
              es: "BEX Trader no es asesoramiento financiero. Operar oro, plata, forex, CFD y productos apalancados implica riesgo.",
              "pt-BR": "BEX Trader não é aconselhamento financeiro. Operar ouro, prata, forex, CFDs e produtos alavancados envolve risco.",
              hi: "BEX Trader वित्तीय सलाह नहीं है। सोना, चांदी, forex, CFD और leveraged products में ट्रेडिंग जोखिमपूर्ण है।",
              tr: "BEX Trader finansal tavsiye değildir. Altın, gümüş, forex, CFD ve kaldıraçlı ürünlerde işlem yapmak risk içerir.",
              de: "BEX Trader ist keine Finanzberatung. Der Handel mit Gold, Silber, Forex, CFDs und Hebelprodukten ist riskant.",
              fr: "BEX Trader n’est pas un conseil financier. Le trading de l’or, de l’argent, du forex, des CFD et des produits à effet de levier comporte des risques.",
              zh: "BEX Trader 不是财务建议。交易黄金、白银、外汇、CFD 和杠杆产品存在风险。",
              ko: "BEX Trader는 금융 조언이 아닙니다. 금, 은, 외환, CFD 및 레버리지 상품 거래에는 위험이 있습니다.",
            })}
          </p>
        </form>
      </div>
    </div>
  );
}
