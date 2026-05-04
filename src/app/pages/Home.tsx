import { Menu, Copy, DollarSign, Calculator, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { PlanBadge } from "../components/PlanBadge";
import { formatDate, formatDateTime, formatNumber, getLanguage, tr, translateBias, translateMarketPhase, translateNews, translateRisk, translateSide } from "../utils/i18n";
import logoImage from "../../assets/67578b6bc0297a415f1729364a3db485950c0551.png";
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

type NotificationPreference = "off" | "instant" | "strong";

function getSignalMinConfidence(symbol: "XAUUSD" | "XAGUSD"): number {
  return symbol === "XAGUSD" ? 60 : 55;
}

function toNum(value: unknown): number | null {
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

  const lang = getLanguage();

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

  const currentPrice = selectedSymbol === "XAUUSD" ? prices?.XAUUSD : prices?.XAGUSD;

  const marketBoard = [
    { pair: "XAUUSD", price: prices?.XAUUSD ?? null, digits: 2 },
    { pair: "XAGUSD", price: prices?.XAGUSD ?? null, digits: 2 },
    { pair: "DXY", price: prices?.DXY ?? null, digits: 2 },
    { pair: "US10Y", price: prices?.US10Y ?? null, digits: 2 },
  ];

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

  return (
    <div className={`min-h-screen ${darkMode ? "bg-[#0a0e1a] text-white" : "bg-gray-50 text-gray-900"} pb-8`}>
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />

      {mobilePushHint && (
        <div className="mx-4 mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/15 px-4 py-3 text-sm text-yellow-200">
          {mobilePushHint}
        </div>
      )}

      <header className={`${darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200"} p-4 border-b`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMenu(true)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-[#1a2332]" : "hover:bg-gray-100"}`}>
              <Menu className="w-5 h-5" />
            </button>
            <img src={logoImage} alt="BEX AI" className="h-20 md:h-24" />
            <div>
              <h1 className="font-bold text-xl md:text-2xl leading-tight">BEX AI</h1>
              <p className={`text-sm md:text-base ${darkMode ? "text-gray-400" : "text-gray-500"} leading-tight`}>
                {tr(lang, "GOLD TRADER", "معامله‌گر طلا", "متداول الذهب")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, tr(lang, "Hello", "سلام", "سلام"), "سلام", "مرحبًا")}</p>
              <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                {localStorage.getItem("userName") || tr(lang, "Trader", "معامله‌گر", "معامله‌گر")}
              </p>
            </div>
            <PlanBadge
              plan={localStorage.getItem("userPlan") || localStorage.getItem("plan") || "free"}
              className="shrink-0"
            />
          </div>
        </div>

        <div className={`mt-3 ${darkMode ? "bg-[#1a2332]" : "bg-gray-100"} rounded-lg p-2 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-bold">⏰</span>
            <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{formattedDate}</span>
          </div>
          <div className="text-teal-400 font-mono font-bold text-sm">{formattedTime}</div>
        </div>
      </header>

      <div className="px-4 space-y-5 md:space-y-3 max-w-7xl md:mx-auto mt-5">
        <div className="flex gap-3">
          <button onClick={() => setSelectedSymbol("XAUUSD")} className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedSymbol === "XAUUSD" ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/20" : darkMode ? "bg-[#1a2332] text-gray-400 border border-gray-800" : "bg-white text-gray-600 border border-gray-300"}`}>
            XAUUSD
          </button>
          <button onClick={() => setSelectedSymbol("XAGUSD")} className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedSymbol === "XAGUSD" ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/20" : darkMode ? "bg-[#1a2332] text-gray-400 border border-gray-800" : "bg-white text-gray-600 border border-gray-300"}`}>
            XAGUSD
          </button>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-4 border`}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-bold text-yellow-400 tracking-widest">{tr(lang, "CURRENCY CONVERTER", "تبدیل ارز", "محول العملات")}</h3>
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
              className={`flex-1 ${darkMode ? "bg-[#1a2332] border-gray-700 text-white" : "bg-gray-100 border-gray-300 text-gray-900"} border rounded-xl px-3 py-2.5 text-sm font-medium`}
            >
              {ALL_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>

            <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800" : "bg-gray-50 border-gray-200"} rounded-xl p-2.5 border`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, "Entry Price", "قیمت ورود", "سعر الدخول")}</p>
              <p className="font-bold">{convertPrice(signal?.entry || null)}</p>
            </div>

            <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800" : "bg-gray-50 border-gray-200"} rounded-xl p-2.5 border`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, "Current", "فعلی", "الحالي")}</p>
              <p className="font-bold">{convertPrice(currentPrice || null)}</p>
            </div>
          </div>

          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-2`}>
            {tr(lang, "*Trading is in USD only. Prices shown for reference.", "*معامله فقط با دلار آمریکا انجام می‌شود. قیمت‌ها فقط برای اطلاع نمایش داده شده‌اند.", "*يتم التداول بالدولار الأمريكي فقط. الأسعار للعرض فقط.")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/tools")}
          className={`w-full ${darkMode ? "bg-[#0f1623] border-gray-800/50 hover:bg-[#131c2b]" : "bg-white border-gray-200 hover:bg-gray-50"} rounded-2xl p-4 border transition-all flex items-center justify-between text-left`}
          aria-label={tr(lang, "Open trading tools", "باز کردن ابزارهای معاملاتی", "فتح أدوات التداول")}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base">{tr(lang, "Trading Tools", "ابزارهای معاملاتی", "أدوات التداول")}</p>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {tr(lang, "Lot size, pip value and risk calculators", "محاسبه لات، ارزش پیپ و ریسک", "حاسبات حجم اللوت وقيمة النقطة والمخاطر")}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
        </button>

        <div className={`${darkMode ? "bg-gradient-to-br from-[#0f1623] to-[#0a0e1a] border-yellow-500/20" : "bg-white border-yellow-500/30"} rounded-3xl p-6 border shadow-2xl relative`}>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-3xl font-bold pt-1">{selectedSymbol}</h2>

            <div className="flex flex-col gap-2 items-end">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${signal ? "bg-yellow-500 text-black" : "bg-gray-500 text-white"}`}>
                {signal ? translateMarketPhase(signal.status || tr(lang, "LIVE", "زنده", "زنده"), lang) : tr(lang, tr(lang, "NO TRADE", "بدون معامله", "بدون معامله"), "بدون معامله", "لا صفقة")}
              </div>

              <div className={`px-4 py-2 rounded-xl font-bold ${signal?.side === "BUY" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30" : signal?.side === "SELL" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30" : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"}`}>
                {translateSide(signal?.side || "WAIT", lang)}
              </div>
            </div>
          </div>

          {signal ? (
            <>
              <p className={`text-sm ${darkMode ? "text-yellow-400" : "text-yellow-600"} mb-6 leading-relaxed`}>
                💡 {tr(lang, "Trade time", "زمان معامله", "وقت الصفقة")}
                {signalTimestamp && (
                  <span className="ml-2 font-mono">
                    • {signalTimestamp.toLocaleString(lang === "fa" ? "fa-IR" : lang === "ar" ? "ar-EG" : "en-US", {
                      timeZone: userTimezone,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: lang === "en",
                    })}
                  </span>
                )}
                {signalExpiresIn && (
                  <span className="ml-2 font-mono">
                    • {tr(lang, "Expires in", "انقضا تا", "ينتهي خلال")} {signalExpiresIn}
                  </span>
                )}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, "Entry", "ورود", "الدخول")}</p>
                  <p className="text-lg font-bold">{signal.entry ? formatNumber(Number(signal.entry), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-red-900/30" : "bg-red-50 border-red-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"} mb-1`}>SL</p>
                  <p className="text-lg font-bold">{signal.sl ? formatNumber(Number(signal.sl), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-green-900/30" : "bg-green-50 border-green-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"} mb-1`}>TP</p>
                  <p className="text-lg font-bold">{signal.tp ? formatNumber(Number(signal.tp), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>R:R</p>
                  <p className="text-lg font-bold text-teal-400">{signal.rr !== null && signal.rr !== undefined ? String(signal.rr) : "—"}</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, "Confidence", "اعتماد", "الثقة")}</p>
                  <p className="text-lg font-bold">{signal.confidence ? `${formatNumber(Number(signal.confidence), lang, { maximumFractionDigits: 0 })}%` : "—"}</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>{tr(lang, "Status", "وضعیت", "الحالة")}</p>
                  <p className="text-sm font-bold text-yellow-400">{signal.status || tr(lang, "LIVE", "زنده", "زنده")}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-6 leading-relaxed`}>
                ⏸️ {tr(lang, "Waiting for the next executable signal. Entry, SL and TP stay empty until a full signal arrives.", "در انتظار سیگنال کامل بعدی. ورود، حد ضرر و حد سود تا آمدن سیگنال کامل خالی می‌مانند.", "بانتظار الإشارة الكاملة التالية. يبقى الدخول ووقف الخسارة والهدف فارغين حتى وصول إشارة كاملة.")}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, "Entry", "ورود", "الدخول")}</p>
                  <p className="text-lg font-bold text-gray-500">—</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-red-900/30" : "bg-red-50 border-red-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"} mb-1`}>SL</p>
                  <p className="text-lg font-bold text-gray-500">—</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-green-900/30" : "bg-green-50 border-green-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"} mb-1`}>TP</p>
                  <p className="text-lg font-bold text-gray-500">—</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>R:R</p>
                  <p className="text-lg font-bold text-gray-500">—</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, "Confidence", "اعتماد", "الثقة")}</p>
                  <p className="text-lg font-bold text-gray-500">—</p>
                </div>
                <div className={`${darkMode ? "bg-[#1a2332]/50 border-gray-800/50" : "bg-gray-50 border-gray-200"} rounded-xl p-3 border`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>{tr(lang, "Status", "وضعیت", "الحالة")}</p>
                  <p className="text-sm font-bold text-gray-500">WAIT</p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              onClick={copySignal}
              className={`px-5 py-3.5 ${darkMode ? "bg-[#1a2332] border-gray-700" : "bg-gray-100 border-gray-300"} border rounded-xl flex items-center justify-center`}
              aria-label={tr(lang, "Copy signal", "کپی سیگنال", "نسخ الإشارة")}
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">{tr(lang, "🌍 MARKET CONTEXT", "🌍 وضعیت بازار", "🌍 سياق السوق")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "Session", "سشن", "سشن"), "سشن", "الجلسة")}</p>
              <p className="font-bold text-sm">{translateMarketPhase(marketContext.session, lang)}</p>
            </div>
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "Volatility", "نوسان", "نوسان"), "نوسان", "التذبذب")}</p>
              <p className="font-bold text-sm">{translateRisk(marketContext.volatility, lang)}</p>
            </div>
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "Bias", "احساس بازار", "احساس بازار"), "احساس بازار", "اتجاه السوق")}</p>
              <p className={`font-bold text-sm ${marketContext.bias === "BULLISH" ? "text-green-400" : marketContext.bias === "BEARISH" ? "text-red-400" : ""}`}>
                {translateBias(marketContext.bias, lang)}
              </p>
            </div>
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "Market Phase", "فاز بازار", "فاز بازار"), "فاز بازار", "مرحلة السوق")}</p>
              <p className="font-bold text-sm">{translateMarketPhase(marketContext.marketPhase, lang)}</p>
            </div>
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "Liquidity Risk", "ریسک/نقدشوندگی", "ریسک/نقدشوندگی"), "شاخص نوسان", "مخاطر السيولة")}</p>
              <p className={`font-bold text-sm ${marketContext.liquidityRisk === "HIGH" ? "text-red-400" : marketContext.liquidityRisk === "LOW" ? "text-green-400" : ""}`}>
                {translateRisk(marketContext.liquidityRisk, lang)}
              </p>
            </div>
            <div className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>{tr(lang, tr(lang, "News", "اخبار", "اخبار"), "اخبار", "الأخبار")}</p>
              <p className="font-bold text-sm">{translateNews(marketContext.news, lang)}</p>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">{tr(lang, "📊 MARKET BOARD", "📊 داده‌های زنده بازار", "📊 بيانات السوق المباشرة")}</h3>
          <div className="space-y-2">
            {marketBoard.map((item) => (
              <div
                key={item.pair}
                className={`flex items-center justify-between ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}
              >
                <span className="font-medium text-sm">{item.pair}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold">
                    {item.price !== null ? formatNumber(item.price, lang, { minimumFractionDigits: item.digits, maximumFractionDigits: item.digits }) : "N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border mb-4`}>
          <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">{tr(lang, "⚡ QUICK STATS", "⚡ آمار سریع", "⚡ إحصاءات سريعة")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickStats.map((stat, index) => (
              <div key={index} className={`${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl p-3`}>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>
                  {stat.label}
                </p>
                <p className="font-bold text-sm">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
