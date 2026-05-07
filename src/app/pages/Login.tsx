import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { Eye, EyeOff } from "lucide-react";
import logoImage from "../../assets/67578b6bc0297a415f1729364a3db485950c0551.png";

const AUTH_BASE =
  import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

const HISTORY_BASE =
  import.meta.env.VITE_MT5_HISTORY_API_URL ||
  import.meta.env.VITE_HISTORY_API_URL ||
  "https://bex-mt5-history-ingest.peymanp370.workers.dev";

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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
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
    const mode = searchParams.get("mode");
    setTitle(mode === "welcome_back" ? "welcome_back" : "welcome");

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
  }, [searchParams, lang]);

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

  const legalRequiredMessage = () => tx(lang, {
    en: "Please confirm that you are 18+ and agree to the Terms of Service and Privacy Policy.",
    fa: "لطفاً تأیید کنید که ۱۸ سال یا بیشتر دارید و با قوانین استفاده و سیاست حریم خصوصی موافق هستید.",
    ar: "يرجى تأكيد أنك تبلغ 18 عامًا أو أكثر وتوافق على شروط الخدمة وسياسة الخصوصية.",
    es: "Confirma que tienes 18 años o más y aceptas los Términos de Servicio y la Política de Privacidad.",
    "pt-BR": "Confirme que você tem 18 anos ou mais e concorda com os Termos de Serviço e a Política de Privacidade.",
    hi: "कृपया पुष्टि करें कि आपकी आयु 18+ है और आप सेवा की शर्तों व गोपनीयता नीति से सहमत हैं।",
    tr: "Lütfen 18 yaşında veya daha büyük olduğunuzu ve Hizmet Şartları ile Gizlilik Politikası’nı kabul ettiğinizi onaylayın.",
    de: "Bitte bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und den Nutzungsbedingungen sowie der Datenschutzrichtlinie zustimmen.",
    fr: "Veuillez confirmer que vous avez 18 ans ou plus et que vous acceptez les Conditions d’utilisation et la Politique de confidentialité.",
    zh: "请确认您已年满 18 岁，并同意服务条款和隐私政策。",
    ko: "만 18세 이상이며 서비스 약관 및 개인정보 처리방침에 동의하는지 확인해 주세요.",
  });

  const ensureLegalAccepted = () => {
    if (acceptedLegal) return true;
    setError(legalRequiredMessage());
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanIdentity = identity.trim();

    if (!ensureLegalAccepted()) return;

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

  const handleGoogleSignIn = () => {
    if (!ensureLegalAccepted()) return;
    setError("");
    setSocialLoading("google");
    clearStoredAuthUser();
    window.location.href = `${AUTH_BASE}/auth/google/start`;
  };

  const handleAppleSignIn = async () => {
    if (!ensureLegalAccepted()) return;

    setError("");
    setSocialLoading("apple");
    clearStoredAuthUser();

    try {
      if (Capacitor.getPlatform() === "ios") {
        const result = await SignInWithApple.authorize({
          clientId: "com.bextrader.app",
          redirectURI: "https://bextrader.com/auth/apple/callback",
          scopes: "email name",
          state: "bex-ios-native",
        });

        const response = result?.response || {};

        const res = await fetch(`${AUTH_BASE}/auth/apple/native`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identityToken: response.identityToken,
            authorizationCode: response.authorizationCode,
            user: response.user,
            email: response.email,
            givenName: response.givenName,
            familyName: response.familyName,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok || !data?.user) {
          throw new Error(data?.code || data?.message || "APPLE_NATIVE_LOGIN_FAILED");
        }

        saveUserToLocalStorage(data.user, data.user.email || "apple");
        await hydrateAccountProfile(data.user?.email || "");
        navigate("/app");
        return;
      }

      // Desktop / web fallback keeps the existing browser OAuth flow.
      window.location.href = `${AUTH_BASE}/auth/apple/start`;
    } catch (err) {
      console.error("Apple native sign-in failed", err);
      setError(tx(lang, {
        en: "Apple Sign-In failed. Please try again.",
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
      }));
    } finally {
      setSocialLoading(null);
    }
  };

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

          <label className={`flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 ${rtl ? "text-right" : "text-left"}`}>
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => {
                setAcceptedLegal(e.target.checked);
                if (e.target.checked && error === legalRequiredMessage()) setError("");
              }}
              className="mt-1 h-5 w-5 shrink-0 rounded border-gray-600 bg-[#111827] accent-yellow-500"
            />
            <span className="leading-relaxed">
              {tx(lang, {
                en: "I confirm that I am 18+ and I agree to BEX Trader’s ",
                fa: "تأیید می‌کنم که ۱۸ سال یا بیشتر دارم و با ",
                ar: "أؤكد أن عمري 18 عامًا أو أكثر وأوافق على ",
                es: "Confirmo que tengo 18 años o más y acepto los ",
                "pt-BR": "Confirmo que tenho 18 anos ou mais e concordo com os ",
                hi: "मैं पुष्टि करता/करती हूँ कि मेरी आयु 18+ है और मैं BEX Trader की ",
                tr: "18 yaşında veya daha büyük olduğumu ve BEX Trader’ın ",
                de: "Ich bestätige, dass ich mindestens 18 Jahre alt bin und den ",
                fr: "Je confirme avoir 18 ans ou plus et accepter les ",
                zh: "我确认我已年满 18 岁，并同意 BEX Trader 的",
                ko: "저는 만 18세 이상이며 BEX Trader의 ",
              })}
              <Link to="/terms" className="font-bold text-yellow-400 hover:text-yellow-300 underline underline-offset-4">
                {tx(lang, {
                  en: "Terms of Service",
                  fa: "قوانین استفاده",
                  ar: "شروط الخدمة",
                  es: "Términos de Servicio",
                  "pt-BR": "Termos de Serviço",
                  hi: "सेवा की शर्तों",
                  tr: "Hizmet Şartları’nı",
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
                es: " y la ",
                "pt-BR": " e a ",
                hi: " और ",
                tr: " ve ",
                de: " und der ",
                fr: " et la ",
                zh: "和",
                ko: " 및 ",
              })}
              <Link to="/privacy" className="font-bold text-yellow-400 hover:text-yellow-300 underline underline-offset-4">
                {tx(lang, {
                  en: "Privacy Policy",
                  fa: "سیاست حریم خصوصی",
                  ar: "سياسة الخصوصية",
                  es: "Política de Privacidad",
                  "pt-BR": "Política de Privacidade",
                  hi: "गोपनीयता नीति",
                  tr: "Gizlilik Politikası’nı",
                  de: "Datenschutzrichtlinie",
                  fr: "Politique de confidentialité",
                  zh: "隐私政策",
                  ko: "개인정보 처리방침",
                })}
              </Link>
              {tx(lang, {
                en: ". I understand trading involves risk.",
                fa: " BEX Trader موافق هستم و می‌دانم معامله‌گری ریسک دارد.",
                ar: " الخاصة بـ BEX Trader وأفهم أن التداول ينطوي على مخاطر.",
                es: " de BEX Trader. Entiendo que operar implica riesgo.",
                "pt-BR": " da BEX Trader. Entendo que trading envolve risco.",
                hi: " से सहमत हूँ। मैं समझता/समझती हूँ कि ट्रेडिंग में जोखिम है।",
                tr: " kabul ediyorum. İşlemlerin risk içerdiğini anlıyorum.",
                de: " von BEX Trader zu. Ich verstehe, dass Trading Risiken beinhaltet.",
                fr: " de BEX Trader. Je comprends que le trading comporte des risques.",
                zh: "。我了解交易存在风险。",
                ko: "에 동의합니다. 거래에는 위험이 있음을 이해합니다.",
              })}
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || socialLoading !== null || !acceptedLegal}
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
              disabled={loading || socialLoading !== null || !acceptedLegal}
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-semibold hover:opacity-95 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              <span>
                {socialLoading === "google"
                  ? tx(lang, {
                      en: "Redirecting to Google...",
                      fa: "در حال انتقال به گوگل...",
                      ar: "جارٍ التحويل إلى Google...",
                      es: "Redirigiendo a Google...",
                      "pt-BR": "Redirecionando para o Google...",
                      hi: "Google पर भेजा जा रहा है...",
                      tr: "Google’a yönlendiriliyor...",
                      de: "Weiterleitung zu Google...",
                      fr: "Redirection vers Google...",
                      zh: "正在跳转到 Google...",
                      ko: "Google로 이동 중...",
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
              disabled={loading || socialLoading === "google" || !acceptedLegal}
              className="w-full flex items-center justify-center gap-3 bg-black text-white border border-gray-700 py-3 rounded-xl font-semibold hover:border-gray-500 transition-all disabled:opacity-50"
            >
              <AppleIcon />
              <span>
                {socialLoading === "apple"
                  ? tx(lang, {
                      en: "Redirecting to Apple...",
                      fa: "در حال انتقال به اپل...",
                      ar: "جارٍ التحويل إلى Apple...",
                      es: "Redirigiendo a Apple...",
                      "pt-BR": "Redirecionando para a Apple...",
                      hi: "Apple पर भेजा जा रहा है...",
                      tr: "Apple’a yönlendiriliyor...",
                      de: "Weiterleitung zu Apple...",
                      fr: "Redirection vers Apple...",
                      zh: "正在跳转到 Apple...",
                      ko: "Apple로 이동 중...",
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
