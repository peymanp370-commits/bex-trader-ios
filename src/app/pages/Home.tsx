import { Menu, Copy, DollarSign, Calculator, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { PlanBadge } from "../components/PlanBadge";
import { AppHeader } from "../components/AppHeader";
import { applyDocumentLanguage, formatDate, formatDateTime, formatNumber, getLanguage, LANGUAGE_OPTIONS, setLanguage, tr, translateBias, translateMarketPhase, translateNews, translateRisk, translateSide, type SupportedLanguage } from "../utils/i18n";
import {
  fetchDashboard,
  DashboardPrices,
  DashboardSignal,
} from "../utils/api";

type DashboardMarketContext = {
  session: string;
  volatility: string;
  bias: string;
  marketPhase: string;
  liquidityRisk: string;
  news: string;
};

const getHomeCacheKey = (symbol: "XAUUSD" | "XAGUSD") =>
  `bex_home_cache_v2_signal_lock_${symbol}`;

const SIGNAL_TTL_MS = 10 * 60 * 1000;
const HOME_REFRESH_MS = 10 * 60 * 1000;
const CLOCK_REFRESH_MS = 1 * 1000;

const PUSH_API_BASE =
  (import.meta as any).env?.VITE_PUSH_API_BASE ||
  (import.meta as any).env?.VITE_PUSH_API_URL ||
  "https://bex-push.peymanp370.workers.dev";

const VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  "";

const STRONG_SIGNAL_MIN_CONFIDENCE = 70;
const BETTER_SIGNAL_MIN_CONFIDENCE_DELTA = 2;
const HOME_PUSH_SENT_KEY = "bex_home_last_pushed_signal_id";
const PUSH_MODE_KEY = "bex_notification_preference";

const POSITION_ENGINE_BASE =
  (import.meta as any).env?.VITE_POSITION_ENGINE_BASE ||
  (import.meta as any).env?.VITE_POSITION_ENGINE_URL ||
  "https://bex-position-engine.peymanp370.workers.dev";

const MT5_STATUS_REFRESH_MS = 30 * 1000;

const BEX_ASSET_VERSION = "v=999";
const BEX_GOLD_BARS_IMAGE = `/assets/bex-gold-bars.png?${BEX_ASSET_VERSION}`;
const BEX_GOLD_SIGNAL_BARS_IMAGE = `/assets/bex-gold-signal-bars.png?${BEX_ASSET_VERSION}`;
const BEX_SILVER_BARS_IMAGE = `/assets/bex-silver-bars.png?${BEX_ASSET_VERSION}`;

function getCommodityImage(symbol: "XAUUSD" | "XAGUSD"): string {
  return symbol === "XAUUSD" ? BEX_GOLD_BARS_IMAGE : BEX_SILVER_BARS_IMAGE;
}

function getSignalCommodityImage(symbol: "XAUUSD" | "XAGUSD"): string {
  return symbol === "XAUUSD" ? BEX_GOLD_SIGNAL_BARS_IMAGE : BEX_SILVER_BARS_IMAGE;
}

function getCommodityName(symbol: "XAUUSD" | "XAGUSD", lang: SupportedLanguage): string {
  return symbol === "XAUUSD"
    ? tr(lang, "Gold", "طلا", "ذهب")
    : tr(lang, "Silver", "نقره", "فضة");
}

function getCommodityTheme(symbol: "XAUUSD" | "XAGUSD") {
  return symbol === "XAUUSD"
    ? {
        tab: "from-yellow-200 via-yellow-500 to-amber-700",
        glow: "bg-yellow-500/25",
        border: "border-yellow-500/40",
        text: "text-yellow-400",
      }
    : {
        tab: "from-white via-slate-300 to-slate-600",
        glow: "bg-slate-300/25",
        border: "border-slate-300/40",
        text: "text-slate-100",
      };
}


type NotificationPreference = "off" | "instant" | "strong";

type Mt5ExecutionItem = {
  id?: number | string | null;
  status?: string | null;
  trade_state?: "PENDING" | "OPEN" | "CLOSED" | "UPDATE" | string | null;
  symbol?: string | null;
  broker_symbol?: string | null;
  side?: string | null;
  lot?: number | string | null;
  entry?: number | string | null;
  fill_price?: number | string | null;
  sl?: number | string | null;
  tp?: number | string | null;
  profit?: number | string | null;
  account_login?: string | null;
  account_server?: string | null;
  signal_id?: string | null;
  created_at?: number | string | null;
  message?: string | null;
};

type Mt5StatusResponse = {
  ok?: boolean;
  account_login?: string | null;
  client_id?: string | null;
  symbol?: string | null;
  latest?: Mt5ExecutionItem | null;
  open_position?: Mt5ExecutionItem | null;
  pending_order?: Mt5ExecutionItem | null;
  items?: Mt5ExecutionItem[];
};


function getSignalMinConfidence(symbol: "XAUUSD" | "XAGUSD"): number {
  return symbol === "XAGUSD" ? 60 : 55;
}

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstLocalStorageValue(keys: string[]): string {
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

function getVipMt5ContextFromStorage() {
  return {
    token: firstLocalStorageValue(["bex_vip_token", "vipToken", "vip_token", "BEX_VIP_TOKEN"]),
    clientId: firstLocalStorageValue(["bex_vip_client_id", "vipClientId", "client_id", "clientId"]),
    accountLogin: firstLocalStorageValue(["bex_mt5_account_login", "mt5_account_login", "account_login", "mt5Login", "loginId"]),
    accountServer: firstLocalStorageValue(["bex_mt5_account_server", "mt5_account_server", "account_server", "mt5Server"]),
  };
}

function hasVipAutoContext(): boolean {
  const ctx = getVipMt5ContextFromStorage();
  return !!(ctx.token && (ctx.accountLogin || ctx.clientId));
}


async function fetchMt5StatusForSymbol(symbol: "XAUUSD" | "XAGUSD"): Promise<Mt5StatusResponse | null> {
  const ctx = getVipMt5ContextFromStorage();
  if (!ctx.token || (!ctx.accountLogin && !ctx.clientId)) return null;

  const qs = new URLSearchParams({ symbol, token: ctx.token, limit: "20" });
  if (ctx.clientId) qs.set("client_id", ctx.clientId);
  if (ctx.accountLogin) qs.set("account_login", ctx.accountLogin);
  if (ctx.accountServer) qs.set("account_server", ctx.accountServer);

  const res = await fetch(`${POSITION_ENGINE_BASE}/mt5-status?${qs.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.reason || `mt5_status_http_${res.status}`);
  }
  return data;
}

function normalizeTradeState(value?: string | null): string {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "PENDING") return "PENDING";
  if (raw === "OPEN") return "OPEN";
  if (raw === "CLOSED") return "CLOSED";
  return raw || "UPDATE";
}

function pickPrimaryMt5Item(status: Mt5StatusResponse | null): Mt5ExecutionItem | null {
  if (!status) return null;
  return status.open_position || status.pending_order || status.latest || null;
}

function formatMt5Time(value?: number | string | null): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try { return new Date(n).toLocaleString(); } catch { return "—"; }
}

function getTradeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


function normalizePricesShape(raw: any): DashboardPrices | null {
  if (!raw) return null;
  const src = raw?.prices && typeof raw.prices === "object" ? raw.prices : raw;
  return {
    XAUUSD: toNum(src?.XAUUSD),
    XAGUSD: toNum(src?.XAGUSD),
    DXY: toNum(src?.DXY),
    US10Y: toNum(src?.US10Y),
    USDCAD: toNum(src?.USDCAD),
  };
}

function normalizeMarketContextShape(raw: any, fallbackSignal?: any): DashboardMarketContext {
  const src = raw && typeof raw === "object" ? raw : {};
  const signal = fallbackSignal && typeof fallbackSignal === "object" ? fallbackSignal : {};

  return {
    session: String(src.session || signal.session || "UNKNOWN").toUpperCase(),
    volatility: String(src.volatility || signal.volatility || signal.volatility_state || "UNKNOWN").toUpperCase(),
    bias: String(
      src.bias ||
        signal.bias ||
        signal.macro_bias ||
        (signal.side === "BUY" ? "BULLISH" : signal.side === "SELL" ? "BEARISH" : "NEUTRAL")
    ).toUpperCase(),
    marketPhase: String(src.market_phase || src.marketPhase || signal.market_phase || "UNKNOWN").toUpperCase(),
    liquidityRisk: String(src.liquidity_risk || src.liquidityRisk || signal.liquidity_risk || signal.risk || "NORMAL").toUpperCase(),
    news: String(src.news || signal.news || signal.news_mode || signal.news_state || "SAFE").toUpperCase(),
  };
}

function isFiniteValue(value: unknown): boolean {
  return Number.isFinite(Number(value));
}

function hasUsableSignal(
  s: DashboardSignal | null | undefined,
  symbol: "XAUUSD" | "XAGUSD" = "XAUUSD"
): boolean {
  if (!s) return false;

  const anySignal = s as any;
  const status = String(anySignal.status || "").toUpperCase();

  const hasFullTradePlan =
    (s.side === "BUY" || s.side === "SELL") &&
    isFiniteValue(s.entry) &&
    isFiniteValue(s.sl) &&
    isFiniteValue(s.tp) &&
    isFiniteValue(s.rr);

  const hasGoodConfidence =
    isFiniteValue(s.confidence) && Number(s.confidence) >= getSignalMinConfidence(symbol);

  const isExecutableTrade =
    anySignal.execute === true ||
    status === "TRADE" ||
    status === "EXECUTE" ||
    status === "EXECUTABLE" ||
    status === "LIVE" ||
    status === "OPEN";

  return hasFullTradePlan && hasGoodConfidence && isExecutableTrade;
}

function isSignalFresh(timestamp: Date | null, now = Date.now()): boolean {
  if (!timestamp) return false;
  return now - timestamp.getTime() <= SIGNAL_TTL_MS;
}

function normalizeNotificationPreference(value: unknown): NotificationPreference {
  const raw = String(value || "instant").trim().toLowerCase();

  if (raw === "off" || raw === "خاموش") return "off";
  if (
    raw === "strong" ||
    raw === "strong_only" ||
    raw === "strong-signals" ||
    raw === "فقط سیگنال‌های قوی" ||
    raw === "فقط سیگنال های قوی"
  ) return "strong";

  return "instant";
}

function getNotificationPreference(): NotificationPreference {
  return normalizeNotificationPreference(
    localStorage.getItem(PUSH_MODE_KEY) ||
    localStorage.getItem("bex_push_preference") ||
    localStorage.getItem("notificationTime") ||
    "instant"
  );
}

function getUserPlan(): string {
  return String(
    localStorage.getItem("userPlan") ||
    localStorage.getItem("plan") ||
    "FREE"
  ).trim().toUpperCase();
}

function canUseStrongSignals(): boolean {
  const plan = getUserPlan().replace(/[^A-Z0-9]+/g, "_");
  const trialActive = String(localStorage.getItem("trialActive") || "").toLowerCase() === "true";
  return plan === "VIP" || plan === "VIP_AUTO" || plan === "LIFETIME" || plan === "PRO" || trialActive;
}

function canSendPushForSignal(signal: DashboardSignal | null | undefined): boolean {
  const mode = getNotificationPreference();
  if (mode === "off") return false;
  if (mode === "instant") return true;
  if (mode === "strong") {
    if (!canUseStrongSignals()) return false;
    return getSignalConfidence(signal) >= STRONG_SIGNAL_MIN_CONFIDENCE;
  }
  return false;
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
}

function isStandalonePWA(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function syncPushPreference(endpoint: string | null, preference: NotificationPreference) {
  if (!endpoint) return;
  try {
    await fetch(`${PUSH_API_BASE}/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, preference }),
    });
  } catch (error) {
    console.warn("BEX push preference sync failed:", error);
  }
}

async function autoSubscribeToBexPush(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const preference = getNotificationPreference();
    if (preference === "off") return { ok: false, reason: "push_off" };

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return { ok: false, reason: "push_not_supported" };
    }

    if (isIOSDevice() && !isStandalonePWA()) {
      return { ok: false, reason: "ios_requires_pwa" };
    }

    if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "missing_vapid_public_key" };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { ok: false, reason: "permission_denied" };

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        preference,
        plan: getUserPlan(),
        strong_min_confidence: STRONG_SIGNAL_MIN_CONFIDENCE,
        source: isIOSDevice() ? "ios_pwa" : "web",
      }),
    });

    await syncPushPreference(subscription.endpoint, preference);
    return { ok: true };
  } catch (error: any) {
    console.warn("BEX auto push subscribe failed:", error);
    return { ok: false, reason: error?.message || "subscribe_failed" };
  }
}

function getSignalConfidence(s: DashboardSignal | null | undefined): number {
  const anySignal = (s || {}) as any;
  const n = Number(anySignal.final_confidence ?? anySignal.confidence ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isIncomingSignalBetter(
  incoming: DashboardSignal | null | undefined,
  current: DashboardSignal | null | undefined
): boolean {
  if (!incoming) return false;
  if (!current) return true;

  const incomingConf = getSignalConfidence(incoming);
  const currentConf = getSignalConfidence(current);
  const incomingRr = Number((incoming as any)?.rr || 0);
  const currentRr = Number((current as any)?.rr || 0);

  if (incomingConf >= currentConf + BETTER_SIGNAL_MIN_CONFIDENCE_DELTA) return true;
  if (incomingConf >= currentConf && Number.isFinite(incomingRr) && Number.isFinite(currentRr) && incomingRr >= currentRr + 0.15) return true;

  return false;
}

async function sendHomeSignalPush(
  s: DashboardSignal | null | undefined,
  symbol: "XAUUSD" | "XAGUSD"
) {
  if (!s || !canSendPushForSignal(s)) return;

  const identity = getSignalIdentity(s);
  if (!identity) return;

  const dedupeKey = `${symbol}:${identity}`;
  if (localStorage.getItem(HOME_PUSH_SENT_KEY) === dedupeKey) return;

  const anySignal = s as any;
  const confidence = getSignalConfidence(s);
  const side = String(s.side || anySignal.side || "").toUpperCase();
  const setup = String(anySignal.setup_type || anySignal.type || "").toUpperCase();
  const signalSymbol = String(anySignal.symbol || symbol).toUpperCase();

  try {
    const res = await fetch(`${PUSH_API_BASE}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `BEX ${signalSymbol} ${side} 🚀`,
        body: `${setup ? setup + " • " : ""}Confidence ${Math.round(confidence)}% • Entry ${s.entry ?? "-"} | SL ${s.sl ?? "-"} | TP ${s.tp ?? "-"}`,
        symbol: signalSymbol,
        side,
        confidence: Math.round(confidence),
        entry: s.entry ?? null,
        sl: s.sl ?? null,
        tp: s.tp ?? null,
        rr: s.rr ?? null,
        setup_type: setup || null,
        signal_id: anySignal.signal_id || anySignal.id || identity,
        tag: anySignal.signal_id || anySignal.id || identity,
        url: "/app/home",
      }),
    });

    const data = await res.json().catch(() => null);
    if (data?.ok) localStorage.setItem(HOME_PUSH_SENT_KEY, dedupeKey);
    else console.warn("BEX home push send failed:", data);
  } catch (error) {
    console.warn("BEX home push send error:", error);
  }
}

function formatExpiresIn(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSignalTimestampIso(dashboard: any): string | null {
  const raw =
    dashboard?.signal?.trade_at ||
    dashboard?.signal?.execute_at ||
    dashboard?.signal?.created_at ||
    dashboard?.signal?.updated_at ||
    dashboard?.signal?.timestamp ||
    dashboard?.signal?.time ||
    dashboard?.meta?.generated_at ||
    null;

  if (!raw) return new Date().toISOString();

  const parsed = new Date(typeof raw === "number" ? raw : String(raw));
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSignalIdentity(s: DashboardSignal | null | undefined): string | null {
  if (!s) return null;
  const anySignal = s as any;
  return String(
    anySignal.signal_id ||
      anySignal.id ||
      `${s.side || ""}-${s.entry || ""}-${s.sl || ""}-${s.tp || ""}-${s.rr || ""}`
  );
}

function saveHomeCache(
  symbol: "XAUUSD" | "XAGUSD",
  data: {
    prices: DashboardPrices | null;
    signal: DashboardSignal | null;
    marketContext: DashboardMarketContext;
    positionsCount: number;
    signalTimestamp: string | null;
  }
) {
  try {
    localStorage.setItem(getHomeCacheKey(symbol), JSON.stringify(data));
  } catch {}
}

function readHomeCache(
  symbol: "XAUUSD" | "XAGUSD"
): {
  prices: DashboardPrices | null;
  signal: DashboardSignal | null;
  marketContext: DashboardMarketContext;
  positionsCount: number;
  signalTimestamp: string | null;
} | null {
  try {
    const raw = localStorage.getItem(getHomeCacheKey(symbol));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const ALL_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS",
  "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP",
  "BYN", "BZD", "CDF", "CLP", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN",
  "ETB", "FJD", "FKP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF",
  "IDR", "ILS", "IMP", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "KES", "KGS", "KHR", "KID", "KMF", "KRW",
  "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT",
  "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
  "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR",
  "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT",
  "TND", "TOP", "TRY", "TTD", "TVD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS", "VES", "VND", "VUV", "WST",
  "XAF", "XCD", "XCG", "XDR", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL"
] as const;

type CurrencyCode = typeof ALL_CURRENCIES[number];

export function Home() {
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState<"XAUUSD" | "XAGUSD">("XAUUSD");
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [currentTime, setCurrentTime] = useState(new Date());
  const lastDashboardFetchRef = useRef(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  const [lang, setHomeLang] = useState<SupportedLanguage>(() => getLanguage());

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const syncLanguage = () => setHomeLang(getLanguage());
    window.addEventListener("languageChange", syncLanguage as EventListener);
    window.addEventListener("storage", syncLanguage);
    return () => {
      window.removeEventListener("languageChange", syncLanguage as EventListener);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  const changeHomeLanguage = (next: unknown) => {
    const value = setLanguage(next);
    setHomeLang(value);
    applyDocumentLanguage(value);
  };

  const [prices, setPrices] = useState<DashboardPrices | null>(null);
  const [signal, setSignal] = useState<DashboardSignal | null>(null);
  const [marketContext, setMarketContext] = useState<DashboardMarketContext>({
    session: "UNKNOWN",
    volatility: "UNKNOWN",
    bias: "NEUTRAL",
    marketPhase: "UNKNOWN",
    liquidityRisk: "NORMAL",
    news: "SAFE",
  });
  const [positionsCount, setPositionsCount] = useState(0);
  const [signalTimestamp, setSignalTimestamp] = useState<Date | null>(null);
  const [fxRates, setFxRates] = useState<Partial<Record<CurrencyCode, number>>>({ USD: 1 });
  const [mobilePushHint, setMobilePushHint] = useState<string | null>(null);
  const [mt5Status, setMt5Status] = useState<Mt5StatusResponse | null>(null);
  const [mt5StatusLoading, setMt5StatusLoading] = useState(false);
  const [mt5StatusError, setMt5StatusError] = useState<string | null>(null);

  // LOW-COST FIX: keep latest dashboard state in refs.
  // This stops the dashboard effect from reconnecting after each state update.
  const pricesRef = useRef<DashboardPrices | null>(null);
  const signalRef = useRef<DashboardSignal | null>(null);
  const signalTimestampRef = useRef<Date | null>(null);
  const marketContextRef = useRef<DashboardMarketContext>({
    session: "UNKNOWN",
    volatility: "UNKNOWN",
    bias: "NEUTRAL",
    marketPhase: "UNKNOWN",
    liquidityRisk: "NORMAL",
    news: "SAFE",
  });
  const positionsCountRef = useRef(0);

  useEffect(() => { pricesRef.current = prices; }, [prices]);
  useEffect(() => { signalRef.current = signal; }, [signal]);
  useEffect(() => { signalTimestampRef.current = signalTimestamp; }, [signalTimestamp]);
  useEffect(() => { marketContextRef.current = marketContext; }, [marketContext]);
  useEffect(() => { positionsCountRef.current = positionsCount; }, [positionsCount]);

  const userTimezone =
    localStorage.getItem("userTimezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let cancelled = false;

    const runAutoPush = async () => {
      if (isIOSDevice() && !isStandalonePWA()) {
        setMobilePushHint(tr(lang, "To enable notifications on iPhone, add BEX to Home Screen and open it from there.", "برای فعال شدن اعلان‌ها در آیفون، BEX را به Home Screen اضافه کن و از همان‌جا باز کن.", "لتفعيل الإشعارات على iPhone، أضف BEX إلى الشاشة الرئيسية وافتحه من هناك."));
        return;
      }

      const result = await autoSubscribeToBexPush();
      if (cancelled) return;
      if (result.ok) setMobilePushHint(null);
      else if (result.reason === "permission_denied") {
        setMobilePushHint(tr(lang, "Notifications are blocked. Enable them in browser settings.", "اعلان‌ها بلاک شده‌اند. از تنظیمات مرورگر فعالش کن.", "الإشعارات محظورة. فعّلها من إعدادات المتصفح."));
      }
    };

    runAutoPush();
    window.addEventListener("storage", runAutoPush);
    window.addEventListener("bexPushPreferenceChanged", runAutoPush as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", runAutoPush);
      window.removeEventListener("bexPushPreferenceChanged", runAutoPush as EventListener);
    };
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadMt5Status = async () => {
      if (!hasVipAutoContext()) {
        setMt5Status(null);
        setMt5StatusError(null);
        setMt5StatusLoading(false);
        return;
      }

      setMt5StatusLoading(true);
      try {
        const status = await fetchMt5StatusForSymbol(selectedSymbol);
        if (cancelled) return;
        setMt5Status(status);
        setMt5StatusError(null);
      } catch (err: any) {
        if (cancelled) return;
        setMt5StatusError(err?.message || "mt5_status_failed");
      } finally {
        if (!cancelled) setMt5StatusLoading(false);
      }
    };

    loadMt5Status();
    timer = setInterval(loadMt5Status, MT5_STATUS_REFRESH_MS);

    const onFocus = () => loadMt5Status();
    window.addEventListener("focus", onFocus);
    window.addEventListener("bexVipContextChanged", onFocus as EventListener);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bexVipContextChanged", onFocus as EventListener);
    };
  }, [selectedSymbol]);

  useEffect(() => {
    const cached = readHomeCache(selectedSymbol);

    const cachedTimestamp = parseIsoDate(cached?.signalTimestamp);
    const cachedSignal =
      hasUsableSignal(cached?.signal, selectedSymbol) && isSignalFresh(cachedTimestamp)
        ? cached!.signal
        : null;

    setPrices(cached?.prices || null);
    setSignal(cachedSignal);
    setSignalTimestamp(cachedSignal ? cachedTimestamp : null);
    setPositionsCount(cached?.positionsCount || 0);
    if (cached?.marketContext) setMarketContext(cached.marketContext);
  }, [selectedSymbol]);

  const loadDashboard = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastDashboardFetchRef.current < HOME_REFRESH_MS) return;
    lastDashboardFetchRef.current = now;

    try {
      const dashboard = await fetchDashboard(selectedSymbol);
      const normalizedDashboardPrices = normalizePricesShape(dashboard?.prices);
      const incomingSignal = hasUsableSignal(dashboard?.signal, selectedSymbol) ? dashboard!.signal : null;
      const incomingSignalIdentity = getSignalIdentity(incomingSignal);
      const currentSignal = signalRef.current;
      const currentSignalTimestamp = signalTimestampRef.current;
      const currentSignalIdentity = getSignalIdentity(currentSignal);
      const currentSignalStillLocked = currentSignal && isSignalFresh(currentSignalTimestamp);
      const isNewIncomingSignal = !!incomingSignal && incomingSignalIdentity !== currentSignalIdentity;

      let activeSignal: DashboardSignal | null = null;
      let activeSignalTimestampIso: string | null = null;

      // SIGNAL LOCK RULE:
      // - A valid/executable signal is locked on the Home page for 10 minutes from the moment the app receives it.
      // - Empty/WAIT/timeout responses from the backend must NOT clear the visible signal.
      // - A different valid signal can replace the old one and starts a fresh 10 minute lock.
      const incomingSignalIsBetter = isIncomingSignalBetter(incomingSignal, currentSignal);
      const shouldReplaceLockedSignal =
        !!incomingSignal &&
        !!currentSignalStillLocked &&
        incomingSignalIdentity !== currentSignalIdentity &&
        incomingSignalIsBetter;

      const shouldUseIncomingSignal =
        !!incomingSignal &&
        (!currentSignalStillLocked || !currentSignal || shouldReplaceLockedSignal);

      if (shouldUseIncomingSignal) {
        activeSignal = incomingSignal;
        activeSignalTimestampIso = new Date().toISOString();
      } else if (currentSignalStillLocked) {
        activeSignal = currentSignal;
        activeSignalTimestampIso = currentSignalTimestamp ? currentSignalTimestamp.toISOString() : null;
      } else if (incomingSignal) {
        activeSignal = incomingSignal;
        activeSignalTimestampIso = new Date().toISOString();
      }

      const nextMarketContext = normalizeMarketContextShape(dashboard?.market_context || marketContextRef.current, dashboard?.signal || activeSignal);
      const nextPositionsCount =
        typeof dashboard?.positions_count === "number"
          ? dashboard.positions_count
          : Array.isArray(dashboard?.positions)
          ? dashboard.positions.length
          : positionsCountRef.current;

      if (normalizedDashboardPrices) setPrices(normalizedDashboardPrices);
      setSignal(activeSignal);
      setSignalTimestamp(parseIsoDate(activeSignalTimestampIso));
      setMarketContext(nextMarketContext);
      setPositionsCount(nextPositionsCount);

      saveHomeCache(selectedSymbol, {
        prices: normalizedDashboardPrices || pricesRef.current,
        signal: activeSignal,
        marketContext: nextMarketContext,
        positionsCount: nextPositionsCount,
        signalTimestamp: activeSignalTimestampIso,
      });

      if (activeSignal && activeSignal === incomingSignal && shouldUseIncomingSignal) {
        await sendHomeSignalPush(activeSignal, selectedSymbol);
      }
    } catch (err) {
      console.error("Home dashboard load failed:", err);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await loadDashboard(true);
    };
    run();
    const interval = setInterval(() => {
      if (mounted) loadDashboard();
    }, HOME_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadDashboard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), CLOCK_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("themeChange", handleStorageChange as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("themeChange", handleStorageChange as EventListener);
    };
  }, []);

  const formattedTime = formatDateTime(currentTime, lang, {
    timeZone: userTimezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: lang === "en",
  });

  const formattedDate = formatDate(currentTime, lang, {
    timeZone: userTimezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    if (Number.isFinite(prices?.USDCAD)) {
      setFxRates((prev) => ({ ...prev, USD: 1, CAD: Number(prices?.USDCAD) }));
    }
  }, [prices?.USDCAD]);

  useEffect(() => {
    if (selectedCurrency === "USD") return;
    if (Number.isFinite(fxRates[selectedCurrency])) return;

    let cancelled = false;

    const loadFxRate = async () => {
      try {
        const res = await fetch(
          `https://prices.bextrader.com/api/fx/rate?from=USD&to=${encodeURIComponent(selectedCurrency)}`
        );
        const data = await res.json();
        const rate = Number(data?.rate);

        if (!cancelled && data?.ok && Number.isFinite(rate)) {
          setFxRates((prev) => ({ ...prev, [selectedCurrency]: rate }));
        }
      } catch (err) {
        console.error("FX rate load failed:", err);
      }
    };

    loadFxRate();
    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, fxRates]);

  const convertPrice = (usdPrice: number | null) => {
    if (!usdPrice) return "—";
    const rate = selectedCurrency === "USD" ? 1 : fxRates[selectedCurrency];
    if (!Number.isFinite(rate)) return "—";
    return formatNumber(usdPrice * Number(rate), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const activeMt5Item = pickPrimaryMt5Item(mt5Status);
  const activeMt5State = normalizeTradeState(activeMt5Item?.trade_state || activeMt5Item?.status);
  const activeMt5Entry = getTradeNumber(activeMt5Item?.entry ?? activeMt5Item?.fill_price);
  const activeMt5Sl = getTradeNumber(activeMt5Item?.sl);
  const activeMt5Tp = getTradeNumber(activeMt5Item?.tp);
  const activeMt5Lot = getTradeNumber(activeMt5Item?.lot);
  const activeMt5Profit = getTradeNumber(activeMt5Item?.profit);
  const showMt5Card = !!activeMt5Item || hasVipAutoContext();

  const currentPrice = selectedSymbol === "XAUUSD" ? prices?.XAUUSD : prices?.XAGUSD;


  const quickStats = [
    { label: tr(lang, "Active Symbol", "نماد فعال", "الرمز النشط"), value: selectedSymbol },
    { label: tr(lang, "Active Trades", "معاملات فعال", "الصفقات النشطة"), value: formatNumber(positionsCount, lang) },
    { label: tr(lang, "Market State", "وضعیت بازار", "حالة السوق"), value: signal?.side ? translateSide(signal.side, lang) : translateMarketPhase(signal?.status || "WAIT", lang) },
  ];

  const signalRemainingMs = signal && signalTimestamp ? Math.max(0, SIGNAL_TTL_MS - (currentTime.getTime() - signalTimestamp.getTime())) : 0;
  const signalExpiresIn = signalRemainingMs > 0 ? formatExpiresIn(signalRemainingMs) : null;

  const copySignal = async () => {
    if (!signal) return;
    const text = [
      `${selectedSymbol}`,
      `${tr(lang, "Side", "جهت", "الاتجاه")}: ${signal.side ? translateSide(signal.side, lang) : "—"}`,
      `${tr(lang, "Entry", "ورود", "الدخول")}: ${signal.entry ?? "—"}`,
      `SL: ${signal.sl ?? "—"}`,
      `TP: ${signal.tp ?? "—"}`,
      `RR: ${signal.rr ?? "—"}`,
      `${tr(lang, "Confidence", "اعتماد", "الثقة")}: ${signal.confidence ?? "—"}%`,
      `${tr(lang, "Status", "وضعیت", "الحالة")}: ${signal.status ? translateMarketPhase(signal.status, lang) : "—"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert(tr(getLanguage(), "Signal copied", "سیگنال کپی شد", "تم نسخ الإشارة"));
    } catch {
      alert(tr(getLanguage(), "Failed to copy signal", "کپی سیگنال ناموفق بود", "فشل نسخ الإشارة"));
    }
  };

  const priceDecimals = selectedSymbol === "XAGUSD" ? 3 : 2;
  const formattedCurrentPrice = currentPrice
    ? formatNumber(Number(currentPrice), lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals })
    : "—";
  const selectedAssetName = selectedSymbol === "XAUUSD"
    ? tr(lang, "Gold / US Dollar", "طلا / دلار آمریکا", "الذهب / الدولار الأمريكي")
    : tr(lang, "Silver / US Dollar", "نقره / دلار آمریکا", "الفضة / الدولار الأمريكي");
  const signalSetupLabel = String((signal as any)?.setup_type || (signal as any)?.type || "—").replace(/_/g, " ");
  const signalDirectionLabel = signal?.side ? translateSide(signal.side, lang) : tr(lang, "WAIT", "انتظار", "انتظار");
  const signalStatusLabel = signal
    ? (signal.status ? translateMarketPhase(signal.status, lang) : tr(lang, "LIVE", "زنده", "زنده"))
    : tr(lang, "WAITING", "در انتظار", "بانتظار");
  const biasIsBullish = marketContext.bias === "BULLISH";
  const biasIsBearish = marketContext.bias === "BEARISH";
  const commodityImage = getCommodityImage(selectedSymbol);
  const signalCommodityImage = getSignalCommodityImage(selectedSymbol);
  const commodityTheme = getCommodityTheme(selectedSymbol);
  const oppositeSymbol: "XAUUSD" | "XAGUSD" = selectedSymbol === "XAUUSD" ? "XAGUSD" : "XAUUSD";
  const oppositePrice = prices?.[oppositeSymbol] ?? null;

  return (
    <div className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden ${darkMode ? "bg-[radial-gradient(circle_at_top_left,#142033_0%,#05070d_38%,#02040a_100%)] text-white" : "bg-gray-50 text-gray-900"} pb-8`}>
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />

      <AppHeader
        title={tr(lang, "Home", "خانه", "الرئيسية")}
        subtitle={tr(lang, "BEX Trader", "معامله‌گر BEX", "متداول BEX")}
        darkMode={darkMode}
        onMenuClick={() => setShowMenu(true)}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", JSON.stringify(next)); window.dispatchEvent(new Event("themeChange")); }}
        showSettings={true}
        showThemeToggle={true}
        badge={
          <PlanBadge
            plan={localStorage.getItem("userPlan") || localStorage.getItem("plan") || "free"}
            className="shrink-0"
          />
        }
      />

      {mobilePushHint && (
        <div className="mx-auto mt-3 w-full max-w-7xl px-4">
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/15 px-4 py-3 text-sm text-yellow-200">
            {mobilePushHint}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl space-y-4 overflow-hidden px-4 pt-3">
        <div className={`${darkMode ? "border-white/10 bg-[#0b1220]/95 shadow-[0_0_35px_rgba(234,179,8,0.05)]" : "border-gray-200 bg-white"} rounded-2xl border p-3 shadow-lg`}> 
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-yellow-400">📅</span>
              <span className={`truncate text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{formattedDate}</span>
            </div>
            <div className="shrink-0 rounded-xl bg-black/20 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Local Time", "زمان محلی", "الوقت المحلي")}</p>
              <p className="font-mono text-sm font-bold text-teal-400">{formattedTime}</p>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? "border-white/10 bg-[#0b1220]/95" : "border-gray-200 bg-white"} rounded-2xl border p-2 shadow-lg`}> 
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/settings")}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${darkMode ? "bg-[#111827] text-yellow-400 hover:bg-[#182235]" : "bg-gray-50 text-yellow-600 hover:bg-gray-100"}`}
              aria-label={tr(lang, "Change Language", "تغییر زبان", "تغيير اللغة")}
            >
              🌐 {tr(lang, "Change Language", "تغییر زبان", "تغيير اللغة")}
            </button>

            <select
              value={lang}
              onChange={(e) => changeHomeLanguage(e.target.value)}
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs font-bold outline-none ${darkMode ? "border-white/10 bg-[#111827] text-white" : "border-gray-200 bg-white text-gray-900"}`}
              aria-label={tr(lang, "Select language", "انتخاب زبان", "اختيار اللغة")}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {["XAUUSD", "XAGUSD"].map((symbol) => {
            const typedSymbol = symbol as "XAUUSD" | "XAGUSD";
            const active = selectedSymbol === typedSymbol;
            const theme = getCommodityTheme(typedSymbol);
            return (
              <button
                key={typedSymbol}
                type="button"
                onClick={() => setSelectedSymbol(typedSymbol)}
                className={`relative overflow-hidden rounded-2xl border py-3 text-sm font-black tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] ${active ? `border-transparent bg-gradient-to-r ${theme.tab} text-black shadow-[0_0_35px_rgba(234,179,8,0.22)]` : darkMode ? "border-white/10 bg-[#0b1220]/95 text-gray-300 hover:border-yellow-500/25" : "border-gray-200 bg-white text-gray-700"}`}
              >
                <span className="pointer-events-none absolute inset-y-0 right-0 w-36" style={{ opacity: active ? 0.58 : 0.22 }}>
                  <img src={getCommodityImage(typedSymbol)} alt="" className="h-full w-full object-cover object-center" />
                </span>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <img src={getCommodityImage(typedSymbol)} alt="" className="h-8 w-12 rounded-xl object-cover shadow-md ring-1 ring-white/20" />
                  <span>{typedSymbol}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className={`${darkMode ? "border-yellow-500/35 bg-gradient-to-br from-[#0d1728] via-[#09111f] to-[#03050b] shadow-[0_0_55px_rgba(234,179,8,0.12)]" : "border-yellow-500/30 bg-white"} relative overflow-hidden rounded-[2rem] border p-5 shadow-2xl`}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-500/15 blur-3xl" />
          <div className={`pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full ${commodityTheme.glow} blur-3xl`} />
          <img
            src={commodityImage}
            alt=""
            className="pointer-events-none absolute bottom-0 right-0 h-full w-[64%] max-w-[760px] object-cover object-center opacity-90"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050812] via-[#050812]/82 to-[#050812]/18" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-2xl border border-yellow-400/20 bg-black/35 p-1.5 shadow-lg shadow-yellow-500/10">
                  <img src={commodityImage} alt="" className="h-10 w-14 rounded-xl object-cover ring-1 ring-white/10" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-wide sm:text-2xl">{selectedSymbol}</h2>
                    <span className="text-yellow-400">★</span>
                  </div>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedAssetName}</p>
                </div>
              </div>

              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{tr(lang, "Live Price", "قیمت زنده", "السعر المباشر")}</p>
              <p className="mt-1 text-5xl font-black tracking-tight drop-shadow-[0_0_18px_rgba(250,204,21,0.20)] sm:text-6xl">{formattedCurrentPrice}</p>
              <p className="mt-1 text-sm font-bold text-green-400">{tr(lang, "Real-time market feed", "داده زنده بازار", "بيانات السوق المباشرة")}</p>
            </div>

            <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/30 p-3 text-right shadow-xl sm:block">
              <div className="mb-2 flex items-center justify-end gap-2">
                <span className="text-xs font-black text-gray-400">{oppositeSymbol}</span>
                <img src={getCommodityImage(oppositeSymbol)} alt="" className="h-8 w-12 rounded-lg object-cover" />
              </div>
              <p className="text-xl font-black">{oppositePrice ? formatNumber(Number(oppositePrice), lang, { minimumFractionDigits: oppositeSymbol === "XAGUSD" ? 3 : 2, maximumFractionDigits: oppositeSymbol === "XAGUSD" ? 3 : 2 }) : "—"}</p>
              <p className="text-xs font-bold text-green-400">{getCommodityName(oppositeSymbol, lang)}</p>
            </div>

            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-bold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" /> {tr(lang, "Open", "باز", "مفتوح")}
              </span>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Daily Bias", "بایاس روزانه", "الاتجاه اليومي")}</p>
              <p className={`mt-1 text-sm font-black ${biasIsBullish ? "text-green-400" : biasIsBearish ? "text-red-400" : "text-yellow-400"}`}>{translateBias(marketContext.bias, lang)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Session", "سشن", "الجلسة")}</p>
              <p className="mt-1 text-sm font-black text-yellow-400">{translateMarketPhase(marketContext.session, lang)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Volatility", "نوسان", "التذبذب")}</p>
              <p className="mt-1 text-sm font-black">{translateRisk(marketContext.volatility, lang)}</p>
            </div>
          </div>
        </section>

        <section className={`${darkMode ? "border-yellow-500/40 bg-gradient-to-br from-[#0c1526] via-[#07101e] to-[#03050b] shadow-[0_0_60px_rgba(234,179,8,0.14)]" : "border-yellow-500/30 bg-white"} relative overflow-hidden rounded-[2rem] border shadow-2xl shadow-yellow-500/5`}>
          <img src={signalCommodityImage} alt="" className="pointer-events-none absolute right-0 top-0 h-40 w-72 object-cover opacity-[0.34]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/15" />
          <div className="relative border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-400">📡 {tr(lang, "BEX LIVE SIGNAL", "سیگنال زنده BEX", "إشارة BEX المباشرة")} <span className="text-green-400">({tr(lang, "FREE", "رایگان", "مجاني")})</span></p>
                <h2 className="mt-3 text-2xl font-black tracking-wide">{selectedSymbol}</h2>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedAssetName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <img src={signalCommodityImage} alt="" className="hidden h-14 w-24 rounded-2xl object-cover shadow-lg ring-1 ring-yellow-400/20 sm:block" />
                <span className={`rounded-xl px-3 py-1 text-xs font-black ${signal ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{signal ? tr(lang, "PUBLIC", "عمومی", "عام") : signalStatusLabel}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className={`col-span-1 rounded-2xl p-4 text-center shadow-inner ${signal?.side === "BUY" ? "bg-green-500/20 text-green-300 ring-1 ring-green-400/20" : signal?.side === "SELL" ? "bg-red-500/20 text-red-300 ring-1 ring-red-400/20" : "bg-gray-500/15 text-gray-300 ring-1 ring-white/10"}`}>
                <p className="text-3xl font-black tracking-widest sm:text-4xl">{signalDirectionLabel}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{signalSetupLabel}</p>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Confidence", "اعتماد", "الثقة")}</p>
                  <p className="mt-1 text-2xl font-black">{signal?.confidence ? `${formatNumber(Number(signal.confidence), lang, { maximumFractionDigits: 0 })}%` : "—"}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-600 shadow-[0_0_18px_rgba(250,204,21,0.45)]" style={{ width: `${Math.max(0, Math.min(100, Number(signal?.confidence || 0)))}%` }} />
                  </div>
                </div>
                <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Status", "وضعیت", "الحالة")}</p>
                  <p className="mt-1 text-xl font-black text-yellow-400">{signalStatusLabel}</p>
                  <p className="mt-2 text-xs text-gray-400">{signalExpiresIn ? `${tr(lang, "Expires in", "انقضا تا", "ينتهي خلال")} ${signalExpiresIn}` : tr(lang, "Waiting for setup", "در انتظار ستاپ", "بانتظار الإعداد")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
            <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} p-4 text-center`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Entry", "ورود", "الدخول")}</p>
              <p className="mt-1 text-lg font-black text-green-400">{signal?.entry ? formatNumber(Number(signal.entry), lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p>
            </div>
            <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} p-4 text-center`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Stop Loss", "حد ضرر", "وقف الخسارة")}</p>
              <p className="mt-1 text-lg font-black text-red-400">{signal?.sl ? formatNumber(Number(signal.sl), lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p>
            </div>
            <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} p-4 text-center`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Take Profit", "حد سود", "جني الربح")}</p>
              <p className="mt-1 text-lg font-black text-green-400">{signal?.tp ? formatNumber(Number(signal.tp), lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p>
            </div>
            <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} p-4 text-center`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Risk/Reward", "ریسک/ریوارد", "المخاطرة/العائد")}</p>
              <p className="mt-1 text-lg font-black text-teal-400">{signal?.rr !== null && signal?.rr !== undefined ? String(signal.rr) : "—"}</p>
            </div>
          </div>

          <div className="p-4">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${darkMode ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-100" : "border-yellow-500/30 bg-yellow-50 text-yellow-800"}`}>
              {signal
                ? tr(lang, "This public signal is visible to every user. Auto execution stays VIP only.", "این سیگنال عمومی برای همه کاربران قابل مشاهده است. اجرای خودکار فقط برای VIP است.", "هذه الإشارة العامة مرئية لكل المستخدمين. التنفيذ التلقائي خاص بـ VIP فقط.")
                : tr(lang, "Waiting for the next executable BEX signal. Entry, SL and TP will appear when the setup is ready.", "در انتظار سیگنال اجرایی بعدی BEX. ورود، حد ضرر و حد سود وقتی ستاپ آماده شد نمایش داده می‌شوند.", "بانتظار إشارة BEX التنفيذية التالية. سيظهر الدخول ووقف الخسارة والهدف عند جاهزية الإعداد.")}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={copySignal}
                className={`rounded-2xl border px-5 py-3 ${darkMode ? "border-white/10 bg-[#121b2b]" : "border-gray-200 bg-gray-50"} flex items-center justify-center`}
                aria-label={tr(lang, "Copy signal", "کپی سیگنال", "نسخ الإشارة")}
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`${darkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-white"} rounded-2xl border p-4`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Bias", "بایاس", "الاتجاه")}</p>
            <p className={`mt-1 text-lg font-black ${biasIsBullish ? "text-green-400" : biasIsBearish ? "text-red-400" : "text-yellow-400"}`}>{translateBias(marketContext.bias, lang)}</p>
          </div>
          <div className={`${darkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-white"} rounded-2xl border p-4`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "News", "اخبار", "الأخبار")}</p>
            <p className="mt-1 text-lg font-black text-green-400">{translateNews(marketContext.news, lang)}</p>
          </div>
          <div className={`${darkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-white"} rounded-2xl border p-4`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Phase", "فاز", "المرحلة")}</p>
            <p className="mt-1 text-sm font-black">{translateMarketPhase(marketContext.marketPhase, lang)}</p>
          </div>
          <div className={`${darkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-white"} rounded-2xl border p-4`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Liquidity", "نقدشوندگی", "السيولة")}</p>
            <p className={`mt-1 text-sm font-black ${marketContext.liquidityRisk === "HIGH" ? "text-red-400" : marketContext.liquidityRisk === "LOW" ? "text-green-400" : "text-yellow-400"}`}>{translateRisk(marketContext.liquidityRisk, lang)}</p>
          </div>
        </div>

        {showMt5Card && (
          <div className={`${darkMode ? "border-yellow-500/30 bg-gradient-to-br from-[#0b1220] via-[#09111f] to-[#03050b]" : "border-yellow-500/30 bg-white"} relative overflow-hidden rounded-3xl border p-5 shadow-xl`}>
            <img src={BEX_GOLD_BARS_IMAGE} alt="" className="pointer-events-none absolute -right-8 -top-4 h-32 w-56 object-cover opacity-[0.18]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.24em] text-yellow-400">👑 {tr(lang, "VIP AUTO TRADE", "معامله خودکار VIP", "تداول VIP الآلي")}</h3>
                <p className={`mt-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, "Real EA orders and positions reported from MT5.", "سفارش‌ها و پوزیشن‌های واقعی EA که از MT5 گزارش شده‌اند.", "أوامر وصفقات EA الحقيقية المرسلة من MT5.")}</p>
              </div>
              <span className={`shrink-0 rounded-xl px-3 py-1 text-xs font-black ${activeMt5State === "OPEN" ? "bg-green-500 text-white" : activeMt5State === "PENDING" ? "bg-yellow-500 text-black" : activeMt5State === "CLOSED" ? "bg-gray-600 text-white" : "bg-yellow-500/15 text-yellow-400"}`}>
                {mt5StatusLoading ? tr(lang, "SYNCING", "در حال همگام‌سازی", "مزامنة") : activeMt5State === "PENDING" ? tr(lang, "PENDING", "در انتظار", "معلق") : activeMt5State === "OPEN" ? tr(lang, "OPEN", "باز", "مفتوح") : activeMt5Item ? activeMt5State : tr(lang, "NOT CONNECTED", "وصل نیست", "غير متصل")}
              </span>
            </div>

            {!hasVipAutoContext() ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{tr(lang, "Connect your MT5 account to show auto-trade status here.", "حساب MT5 را وصل کن تا وضعیت معامله خودکار اینجا نمایش داده شود.", "اربط حساب MT5 لعرض حالة التداول الآلي هنا.")}</p>
                <button type="button" onClick={() => navigate("/app/vip-auto")} className="rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-black text-black">
                  {tr(lang, "Connect MT5 Account", "اتصال حساب MT5", "ربط حساب MT5")}
                </button>
              </div>
            ) : mt5StatusError ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {tr(lang, "Could not load MT5 status", "وضعیت MT5 خوانده نشد", "تعذر تحميل حالة MT5")}: {mt5StatusError}
              </div>
            ) : activeMt5Item ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}><p className="text-xs text-gray-400">Symbol</p><p className="font-black">{activeMt5Item.symbol || selectedSymbol}</p></div>
                  <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}><p className="text-xs text-gray-400">Side</p><p className={`font-black ${String(activeMt5Item.side).toUpperCase() === "SELL" ? "text-red-400" : "text-green-400"}`}>{translateSide(activeMt5Item.side || "WAIT", lang)}</p></div>
                  <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}><p className="text-xs text-gray-400">Lot</p><p className="font-black">{activeMt5Lot !== null ? formatNumber(activeMt5Lot, lang, { maximumFractionDigits: 2 }) : "—"}</p></div>
                  <div className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-3`}><p className="text-xs text-gray-400">P/L</p><p className={`font-black ${activeMt5Profit !== null && activeMt5Profit < 0 ? "text-red-400" : "text-green-400"}`}>{activeMt5Profit !== null ? formatNumber(activeMt5Profit, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className={`${darkMode ? "bg-[#121b2b] border-white/10" : "bg-gray-50 border-gray-200"} rounded-2xl border p-3`}><p className="text-xs text-gray-400">Entry</p><p className="text-lg font-black">{activeMt5Entry !== null ? formatNumber(activeMt5Entry, lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p></div>
                  <div className={`${darkMode ? "bg-[#121b2b] border-red-900/30" : "bg-red-50 border-red-200"} rounded-2xl border p-3`}><p className="text-xs text-red-400">SL</p><p className="text-lg font-black">{activeMt5Sl !== null ? formatNumber(activeMt5Sl, lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p></div>
                  <div className={`${darkMode ? "bg-[#121b2b] border-green-900/30" : "bg-green-50 border-green-200"} rounded-2xl border p-3`}><p className="text-xs text-green-400">TP</p><p className="text-lg font-black">{activeMt5Tp !== null ? formatNumber(activeMt5Tp, lang, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }) : "—"}</p></div>
                </div>
                <p className="mt-3 text-xs text-gray-500">{tr(lang, "Last EA report", "آخرین گزارش EA", "آخر تقرير EA")}: {formatMt5Time(activeMt5Item.created_at)}{activeMt5Item.signal_id ? ` • ${activeMt5Item.signal_id}` : ""}</p>
              </>
            ) : (
              <div className={`${darkMode ? "bg-[#121b2b] border-white/10" : "bg-gray-50 border-gray-200"} mt-4 rounded-2xl border p-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {mt5StatusLoading ? tr(lang, "Loading MT5 status...", "در حال خواندن وضعیت MT5...", "جاري تحميل حالة MT5...") : tr(lang, "No pending order or open position has been reported yet.", "هنوز سفارش در انتظار یا پوزیشن باز گزارش نشده است.", "لم يتم الإبلاغ عن أمر معلق أو صفقة مفتوحة بعد.")}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${darkMode ? "border-white/10 bg-[#0b1220]/95 shadow-[0_0_35px_rgba(148,163,184,0.06)]" : "border-gray-200 bg-white"} relative overflow-hidden rounded-3xl border p-5`}>
            <img src={selectedSymbol === "XAUUSD" ? BEX_GOLD_BARS_IMAGE : BEX_SILVER_BARS_IMAGE} alt="" className="pointer-events-none absolute -right-8 bottom-0 h-24 w-40 object-cover opacity-20 mix-blend-screen" />
            <div className="relative mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">{tr(lang, "CURRENCY CONVERTER", "تبدیل ارز", "محول العملات")}</h3>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                className={`min-w-0 flex-1 rounded-2xl border px-3 py-3 text-sm font-bold ${darkMode ? "border-white/10 bg-[#121b2b] text-white" : "border-gray-200 bg-gray-50 text-gray-900"}`}
              >
                {ALL_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
              <div className="rounded-2xl border border-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tr(lang, "Current", "فعلی", "الحالي")}</p>
                <p className="font-black">{convertPrice(currentPrice || null)}</p>
              </div>
            </div>
            <p className={`mt-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, "*Trading is in USD only. Prices shown for reference.", "*معامله فقط با دلار آمریکا انجام می‌شود. قیمت‌ها فقط برای اطلاع نمایش داده شده‌اند.", "*يتم التداول بالدولار الأمريكي فقط. الأسعار للعرض فقط.")}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/app/tools")}
            className={`relative overflow-hidden rounded-3xl border p-5 text-left transition-all hover:scale-[1.01] ${darkMode ? "border-white/10 bg-[#0b1220]/95 hover:bg-[#111827] shadow-[0_0_35px_rgba(234,179,8,0.06)]" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            aria-label={tr(lang, "Open trading tools", "باز کردن ابزارهای معاملاتی", "فتح أدوات التداول")}
          >
            <img src={BEX_GOLD_BARS_IMAGE} alt="" className="pointer-events-none absolute -right-10 bottom-0 h-24 w-44 object-cover opacity-20 mix-blend-screen" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/20">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-black">{tr(lang, "Trading Tools", "ابزارهای معاملاتی", "أدوات التداول")}</p>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, "Lot size, pip value and risk calculators", "محاسبه لات، ارزش پیپ و ریسک", "حاسبات حجم اللوت وقيمة النقطة والمخاطر")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          </button>
        </div>

        <div className={`${darkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-white"} relative mb-4 overflow-hidden rounded-3xl border p-5`}>
          <img src={BEX_SILVER_BARS_IMAGE} alt="" className="pointer-events-none absolute right-0 top-0 h-24 w-40 object-cover opacity-20 mix-blend-screen" />
          <h3 className="relative mb-4 text-xs font-black uppercase tracking-[0.22em] text-yellow-400">⚡ {tr(lang, "QUICK STATS", "آمار سریع", "إحصاءات سريعة")}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickStats.map((stat, index) => (
              <div key={index} className={`${darkMode ? "bg-[#121b2b]" : "bg-gray-50"} rounded-2xl p-4`}>
                <p className={`mb-1 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
                <p className="text-sm font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
