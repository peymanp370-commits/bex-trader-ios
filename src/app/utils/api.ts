import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
const AUTH_BASE =
  import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

const APP_API_BASE =
  import.meta.env.VITE_APP_API_URL || "https://bex-app.peymanp370.workers.dev";

export type AuthUser = {
  id?: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  country?: string;
  plan?: string;
  role?: "admin" | "customer" | string;
  status?: string;
  is_verified?: number | boolean;
};

export type AuthResponse = {
  ok: boolean;
  message?: string;
  user?: AuthUser | null;
};

const LOCAL_AUTH_KEYS = [
  "authToken",
  "accessToken",
  "token",
  "refresh_token",
  "bex_refresh_token",
  "user",
  "authUser",
  "currentUser",
  "userEmail",
  "userName",
  "userFirstName",
  "userLastName",
  "userPlan",
  "bex_user",
  "bex_auth",
  "bex_token",
  "isAuthenticated",
];

export function getStoredRefreshToken(): string {
  try {
    return (
      localStorage.getItem("bex_refresh_token") ||
      localStorage.getItem("refresh_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("bex_token") ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredRefreshToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AUTH_COOKIE_NAMES = [
  "bex_session",
  "bex_auth",
  "auth_session",
  "session",
  "token",
  "refresh_token",
  "bex_refresh_token",
  "__Secure-bex_session",
  "__Host-bex_session",
];

function expireCookie(name: string) {
  try {
    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    const paths = ["/", "/auth", "/api"];
    const domains = [undefined, window.location.hostname, ".bextrader.com", "auth.bextrader.com"];

    for (const path of paths) {
      document.cookie = `${name}=; expires=${expires}; max-age=0; path=${path}; SameSite=None; Secure`;
      for (const domain of domains) {
        if (!domain) continue;
        document.cookie = `${name}=; expires=${expires}; max-age=0; path=${path}; domain=${domain}; SameSite=None; Secure`;
      }
    }
  } catch {}
}

export function clearLocalAuthState() {
  try {
    LOCAL_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));

    // Also clear common auth-related keys without touching app preferences like language/theme.
    Object.keys(localStorage).forEach((key) => {
      const k = key.toLowerCase();
      if (
        k.includes("auth") ||
        k.includes("token") ||
        k.includes("session") ||
        k.includes("credential") ||
        k.includes("login") ||
        k.includes("oauth") ||
        k.includes("google") ||
        k.includes("apple") ||
        k.includes("user") ||
        k.startsWith("bex_")
      ) {
        // Keep non-auth user preferences.
        if (["userlanguage", "usercountry", "usertimezone"].includes(k)) return;
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();
    AUTH_COOKIE_NAMES.forEach(expireCookie);
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

async function clearNativeSocialSessions() {
  try {
    if (!Capacitor.isNativePlatform()) return;

    await Promise.allSettled([
      SocialLogin.logout({ provider: "google" } as any),
      SocialLogin.logout({ provider: "apple" } as any),
    ]);
  } catch {
    // Never block logout because native provider cleanup failed.
  }
}

export type VipMeResponse = {
  ok: boolean;
  user?: AuthUser | null;
  vip?: {
    active: boolean;
    client_id?: string | null;
    token?: string | null;
    mt5_account_login?: string | null;
    allowed_symbols?: string | null;
    max_lot?: number | null;
    max_trades?: number | null;
    expires_at?: number | null;
    last_seen_at?: number | null;
    plan?: string | null;
  } | null;
  execution?: { auto_trading_enabled?: number; max_lot?: number; max_trades?: number; risk_mode?: string } | null;
  trading_account?: { login_id?: string | null; server?: string | null; platform?: string | null; is_active?: number } | null;
  message?: string;
};

export type MyStatsResponse = {
  ok: boolean;
  account_login?: string | null;
  stats: {
    total_trades: number;
    wins: number;
    losses: number;
    flats: number;
    win_rate: number;
    total_pnl: number;
    avg_pnl: number;
    last_close_time?: number | null;
  };
};

export type AdminCustomersResponse = {
  ok: boolean;
  count: number;
  customers: Array<any>;
};

export interface DashboardSignal {
  side: "BUY" | "SELL" | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  rr: string | number | null;
  confidence: number | null;
  setup_type?: string;
  status: string;
  timeframe?: string | null;
  updated_at?: string | null;
  signal_id?: string | null;
  session?: string | null;
  volatility?: string | null;
  volatility_state?: string | null;
  bias?: string | null;
  macro_bias?: string | null;
  market_phase?: string | null;
  liquidity_risk?: string | null;
  news?: string | null;
  news_mode?: string | null;
  news_state?: string | null;
  [key: string]: any;
}

export interface DashboardPrices {
  XAUUSD: number | null;
  XAGUSD: number | null;
  DXY: number | null;
  US10Y: number | null;
  USDCAD: number | null;
}

export interface DashboardPosition {
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  sl: number;
  tp: number;
  profit: number;
  status: string;
  open_time: number;
  close_time?: number;
  volume?: number;
  current_price?: number;
}

export interface DashboardMarketContext {
  session?: string | null;
  volatility?: string | null;
  bias?: string | null;
  market_phase?: string | null;
  liquidity_risk?: string | null;
  news?: string | null;
}

export interface DashboardResponse {
  ok: boolean;
  signal: DashboardSignal | null;
  prices: DashboardPrices;
  positions: DashboardPosition[];
  positions_count?: number;
  market_context?: DashboardMarketContext | null;
  meta?: Record<string, any>;
}

export interface PricesResponse {
  ok: boolean;
  XAUUSD: number | null;
  XAGUSD: number | null;
  USDCAD: number | null;
  XAUCAD: number | null;
  XAGCAD: number | null;
  DXY: number | null;
  US10Y: number | null;
}

export interface SignalResponse {
  ok: boolean;
  symbol: string;
  type?: "BUY" | "SELL";
  side?: "BUY" | "SELL";
  entry: number | null;
  sl: number | null;
  tp: number | null;
  confidence: number | null;
  rr: string | number | null;
  status: string;
  idea?: string;
  price?: number | null;
  change?: number | null;
  timeframe?: string | null;
  updated_at?: string | null;
  signal_id?: string | null;
  session?: string | null;
  volatility?: string | null;
  volatility_state?: string | null;
  bias?: string | null;
  macro_bias?: string | null;
  market_phase?: string | null;
  liquidity_risk?: string | null;
  news?: string | null;
  news_mode?: string | null;
  news_state?: string | null;
  [key: string]: any;
}

export interface Candle {
  symbol: string;
  bucket: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isoTime: string;
}

export interface ChartResponse {
  ok: boolean;
  symbol: string;
  tf: string;
  count?: number;
  candles: Candle[];
}

export interface Position {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  entry_price: number;
  current_price: number;
  profit: number;
  open_time: number;
  status: string;
  sl?: number;
  tp?: number;
}

export interface PositionsResponse {
  ok: boolean;
  count: number;
  positions: Position[];
}

export interface ClosedTrade {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  entry_price: number;
  exit_price: number;
  profit: number;
  open_time: number;
  close_time: number;
  status: string;
}

export interface TradeHistoryResponse {
  ok: boolean;
  count: number;
  trades: ClosedTrade[];
}

export interface TradeStats {
  total_trades: number;
  wins: number;
  losses: number;
  flats: number;
  average_pnl: number;
  total_pnl: number;
  last_close_time?: number;
  [key: string]: any;
}

export interface StatsResponse {
  ok: boolean;
  stats: TradeStats;
}

export interface TerminalData {
  symbol: string;
  plan: {
    entry: number | null;
    sl: number | null;
    tp: number | null;
    rr: string | null;
  };
  terminal_decision: {
    trade: string;
    side: "BUY" | "SELL" | null;
    confidence: number | null;
  };
  market: {
    volatility: string;
    macro_bias: string;
    session: string;
    liquidity_risk: string;
  };
}

export interface TerminalResponse {
  ok: boolean;
  data: TerminalData;
}

export interface PreparedSignal {
  symbol: string;
  side: "BUY" | "SELL" | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  rr: string | null;
  confidence: number | null;
  status: string;
}

export interface PrepareResponse {
  ok: boolean;
  signal: PreparedSignal;
}

export interface MT5Trade {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  entry_price: number;
  current_price?: number;
  profit?: number;
  open_time: number;
  close_time?: number;
  status: "OPEN" | "CLOSED";
  sl?: number;
  tp?: number;
  exit_price?: number;
}

export interface MT5HistoryResponse {
  ok: boolean;
  count: number;
  trades: MT5Trade[];
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(`${APP_API_BASE}${url}`, {
  ...init,
  signal: controller.signal,
  cache: "no-store",
  credentials: init.credentials ?? "omit",
  mode: "cors",
  headers: {
    accept: "application/json",
    ...(init.headers || {}),
  },
});
    return response;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSide(value: any): "BUY" | "SELL" | null {
  const side = String(value || "").toUpperCase();
  if (side === "BUY" || side === "SELL") return side;
  return null;
}

function formatRrValue(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return `1:${value.toFixed(1)}`;
}

function calcRR(entry: number | null, sl: number | null, tp: number | null, side: "BUY" | "SELL" | null): string | null {
  if (entry === null || sl === null || tp === null || !side) return null;

  const risk = side === "BUY" ? entry - sl : sl - entry;
  const reward = side === "BUY" ? tp - entry : entry - tp;

  if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0 || reward <= 0) {
    return null;
  }

  return formatRrValue(reward / risk);
}

function normalizeStatus(raw: any, side: "BUY" | "SELL" | null, entry: number | null, sl: number | null, tp: number | null): string {
  const status = String(raw?.status || raw?.state || "").trim();
  if (status) return status.toUpperCase();

  if (side && entry !== null && sl !== null && tp !== null) {
    return "SUGGESTED";
  }

  return "WAIT";
}

function normalizePricesResponse(raw: any): PricesResponse | null {
  if (!raw?.ok) return null;

  const src = raw?.prices && typeof raw.prices === "object" ? raw.prices : raw;

  return {
    ok: true,
    XAUUSD: toNumber(src?.XAUUSD),
    XAGUSD: toNumber(src?.XAGUSD),
    USDCAD: toNumber(src?.USDCAD),
    XAUCAD: toNumber(src?.XAUCAD),
    XAGCAD: toNumber(src?.XAGCAD),
    DXY: toNumber(src?.DXY),
    US10Y: toNumber(src?.US10Y),
  };
}

const MARKET_PRICE_CACHE_KEY = "bex_market_price_cache_v1";
const MARKET_PRICE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type DashboardPriceKey = keyof DashboardPrices;
const DASHBOARD_PRICE_KEYS: DashboardPriceKey[] = ["XAUUSD", "XAGUSD", "DXY", "US10Y", "USDCAD"];

type MarketPriceCache = {
  updated_at: number;
  prices: Partial<Record<DashboardPriceKey, number>>;
};

function isValidMarketPrice(value: any): value is number {
  const n = toNumber(value);
  return n !== null && Number.isFinite(n) && n > 0;
}

function readMarketPriceCache(): MarketPriceCache | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(MARKET_PRICE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MarketPriceCache;
    if (!parsed || typeof parsed !== "object") return null;

    const updatedAt = Number(parsed.updated_at || 0);
    if (!updatedAt || Date.now() - updatedAt > MARKET_PRICE_CACHE_MAX_AGE_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeMarketPriceCache(prices: Partial<DashboardPrices>) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;

    const previous = readMarketPriceCache()?.prices || {};
    const next: Partial<Record<DashboardPriceKey, number>> = { ...previous };

    for (const key of DASHBOARD_PRICE_KEYS) {
      const value = prices[key];
      if (isValidMarketPrice(value)) {
        next[key] = Number(value);
      }
    }

    window.localStorage.setItem(
      MARKET_PRICE_CACHE_KEY,
      JSON.stringify({ updated_at: Date.now(), prices: next })
    );
  } catch {
    // localStorage can be unavailable in private mode; fail open.
  }
}

function applyMarketPriceCache(prices: DashboardPrices): DashboardPrices {
  const cachedPrices = readMarketPriceCache()?.prices || {};
  const merged: DashboardPrices = { ...prices };

  for (const key of DASHBOARD_PRICE_KEYS) {
    const liveValue = prices[key];

    if (isValidMarketPrice(liveValue)) {
      merged[key] = Number(liveValue);
      continue;
    }

    const cachedValue = cachedPrices[key];
    merged[key] = isValidMarketPrice(cachedValue) ? Number(cachedValue) : null;
  }

  writeMarketPriceCache(merged);
  return merged;
}

function pickEntry(raw: any): number | null {
  return (
    toNumber(raw?.entry) ??
    toNumber(raw?.reference_entry) ??
    toNumber(raw?.setup_zone?.reference_entry) ??
    toNumber(raw?.plan?.entry) ??
    toNumber(raw?.signal?.entry) ??
    null
  );
}

function pickSl(raw: any): number | null {
  return toNumber(raw?.sl) ?? toNumber(raw?.plan?.sl) ?? toNumber(raw?.signal?.sl) ?? null;
}

function pickTp(raw: any): number | null {
  return toNumber(raw?.tp) ?? toNumber(raw?.plan?.tp) ?? toNumber(raw?.signal?.tp) ?? null;
}

function pickConfidence(raw: any): number | null {
  return (
    toNumber(raw?.confidence) ??
    toNumber(raw?.final_score) ??
    toNumber(raw?.mtf_score) ??
    toNumber(raw?.signal?.confidence) ??
    null
  );
}

function pickSession(raw: any): string | null {
  return raw?.session ?? raw?.market?.session ?? null;
}

function pickVolatility(raw: any): string | null {
  return raw?.volatility ?? raw?.volatility_state ?? raw?.market?.volatility ?? null;
}

function pickMacroBias(raw: any): string | null {
  return raw?.bias ?? raw?.macro_bias ?? raw?.market?.macro_bias ?? null;
}

function pickLiquidityRisk(raw: any): string | null {
  return raw?.liquidity_risk ?? raw?.market?.liquidity_risk ?? null;
}

function pickNews(raw: any): string | null {
  return raw?.news ?? raw?.news_mode ?? raw?.news_state ?? raw?.market?.news ?? null;
}

function buildNormalizedSignal(raw: any, fallbackSymbol?: string): SignalResponse | null {
  if (!raw || raw?.ok === false) return null;

  const source = raw?.signal && typeof raw.signal === "object" ? raw.signal : raw;
  const side = normalizeSide(source?.side ?? source?.type ?? source?.terminal_decision?.side);
  const entry = pickEntry(source);
  const sl = pickSl(source);
  const tp = pickTp(source);
  const rr = source?.rr ?? source?.plan?.rr ?? calcRR(entry, sl, tp, side);
  const confidence = pickConfidence(source);
  const status = normalizeStatus(source, side, entry, sl, tp);

  const normalized: SignalResponse = {
    ...source,
    ok: true,
    symbol: String(source?.symbol || fallbackSymbol || ""),
    type: side ?? undefined,
    side: side ?? undefined,
    entry,
    sl,
    tp,
    confidence,
    rr,
    status,
    price: toNumber(source?.price),
    change: toNumber(source?.change),
    timeframe: source?.timeframe ?? source?.tf ?? null,
    updated_at: source?.updated_at ?? source?.last_update ?? null,
    signal_id: source?.signal_id ?? null,
    session: pickSession(source),
    volatility: pickVolatility(source),
    volatility_state: source?.volatility_state ?? pickVolatility(source),
    bias: source?.bias ?? pickMacroBias(source),
    macro_bias: pickMacroBias(source),
    market_phase: source?.market_phase ?? source?.phase ?? null,
    liquidity_risk: pickLiquidityRisk(source),
    news: pickNews(source),
    news_mode: source?.news_mode ?? source?.market?.news_mode ?? null,
    news_state: source?.news_state ?? null,
  };

  const hasSignalCore = !!(normalized.side || normalized.entry !== null || normalized.sl !== null || normalized.tp !== null || normalized.confidence !== null);
  return hasSignalCore ? normalized : null;
}

function normalizeSignalResponse(raw: any, symbol?: "XAUUSD" | "XAGUSD"): SignalResponse | null {
  return buildNormalizedSignal(raw, symbol);
}

function normalizeDashboardSignal(raw: any): DashboardSignal | null {
  const normalized = buildNormalizedSignal(raw);
  if (!normalized) return null;

  return {
    side: normalized.side ?? null,
    entry: normalized.entry,
    sl: normalized.sl,
    tp: normalized.tp,
    rr: normalized.rr,
    confidence: normalized.confidence,
    setup_type: normalized.setup_type ?? undefined,
    status: normalized.status,
    timeframe: normalized.timeframe ?? null,
    updated_at: normalized.updated_at ?? null,
    signal_id: normalized.signal_id ?? null,
    session: normalized.session ?? null,
    volatility: normalized.volatility ?? null,
    volatility_state: normalized.volatility_state ?? null,
    bias: normalized.bias ?? null,
    macro_bias: normalized.macro_bias ?? null,
    market_phase: normalized.market_phase ?? null,
    liquidity_risk: normalized.liquidity_risk ?? null,
    news: normalized.news ?? null,
    news_mode: normalized.news_mode ?? null,
    news_state: normalized.news_state ?? null,
    ...normalized,
  };
}

function normalizeDashboardPrices(raw: any): DashboardPrices {
  const prices = normalizePricesResponse(raw);

  return applyMarketPriceCache({
    XAUUSD: prices?.XAUUSD ?? null,
    XAGUSD: prices?.XAGUSD ?? null,
    DXY: prices?.DXY ?? null,
    US10Y: prices?.US10Y ?? null,
    USDCAD: prices?.USDCAD ?? null,
  });
}

function normalizePositionsResponse(raw: any): PositionsResponse {
  if (raw?.ok && Array.isArray(raw.positions)) {
    return {
      ok: true,
      count: typeof raw.count === "number" ? raw.count : raw.positions.length,
      positions: raw.positions,
    };
  }

  return { ok: true, count: 0, positions: [] };
}

function normalizeDashboardMarketContext(raw: any): DashboardMarketContext | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    session: raw.session ?? null,
    volatility: raw.volatility ?? null,
    bias: raw.bias ?? null,
    market_phase: raw.market_phase ?? raw.marketPhase ?? null,
    liquidity_risk: raw.liquidity_risk ?? raw.liquidityRisk ?? null,
    news: raw.news ?? null,
  };
}

export async function registerUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  phone?: string;
  timezone?: string;
  country?: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await safeJson<AuthResponse>(response);

    if (!response.ok) {
      return data || { ok: false, message: `Register failed (${response.status})` };
    }

    return data || { ok: false, message: "Invalid server response" };
  } catch (error) {
    console.error("Error registering user:", error);
    return { ok: false, message: "Failed to register" };
  }
}

export async function loginUser(payload: {
  identity: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await safeJson<AuthResponse>(response);

    if (!response.ok) {
      return data || { ok: false, message: `Login failed (${response.status})` };
    }

    return data || { ok: false, message: "Invalid server response" };
  } catch (error) {
    console.error("Error logging in:", error);
    return { ok: false, message: "Failed to login" };
  }
}

export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });

    const data = await safeJson<AuthResponse>(response);

    if (!response.ok) {
      return data || { ok: false, message: `Unauthorized (${response.status})` };
    }

    return data || { ok: false, message: "Invalid server response" };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return { ok: false, message: "Failed to fetch user" };
  }
}

export async function logout(): Promise<AuthResponse> {
  let lastData: AuthResponse | null = null;

  try {
    const headers = authHeaders();

    // Clear the current server cookie/session.
    const response = await fetch(`${AUTH_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
    });
    lastData = await safeJson<AuthResponse>(response);

    // Clear all server-side sessions for this browser/app when available.
    await fetch(`${AUTH_BASE}/auth/logout-all`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
    }).catch(() => undefined);
  } catch (error) {
    console.error("Error logging out:", error);
  } finally {
    await clearNativeSocialSessions();
    clearLocalAuthState();
  }

  return lastData || { ok: true, message: "Logged out" };
}


export async function fetchPrices(): Promise<PricesResponse | null> {
  const attempts = [
    `/api/prices`,
    `/api/dashboard?symbol=XAUUSD`,
  ];

  for (const url of attempts) {
    try {
      const response = await fetchJsonWithTimeout(url, {}, 45000);

      if (!response.ok) continue;

      const raw = await response.json();

      if (url.includes("/api/dashboard")) {
        const normalizedFromDashboard = normalizePricesResponse(raw?.prices ?? raw);
        if (normalizedFromDashboard) {
          const cached = applyMarketPriceCache({
            XAUUSD: normalizedFromDashboard.XAUUSD,
            XAGUSD: normalizedFromDashboard.XAGUSD,
            DXY: normalizedFromDashboard.DXY,
            US10Y: normalizedFromDashboard.US10Y,
            USDCAD: normalizedFromDashboard.USDCAD,
          });

          return { ...normalizedFromDashboard, ...cached };
        }
        continue;
      }

      const normalized = normalizePricesResponse(raw);
      if (normalized) {
        const cached = applyMarketPriceCache({
          XAUUSD: normalized.XAUUSD,
          XAGUSD: normalized.XAGUSD,
          DXY: normalized.DXY,
          US10Y: normalized.US10Y,
          USDCAD: normalized.USDCAD,
        });

        return { ...normalized, ...cached };
      }
    } catch (error) {
      console.error("fetchPrices attempt failed:", url, error);
    }
  }

  console.error("fetchPrices failed: all price endpoints unavailable");
  return null;
}

export async function fetchSignal(symbol: "XAUUSD" | "XAGUSD"): Promise<SignalResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/api/signal?symbol=${symbol}`, {}, 45000);

    if (!response.ok) {
      console.error("fetchSignal failed:", response.status, response.statusText);
      return null;
    }

    const raw = await response.json();
    return normalizeSignalResponse(raw, symbol);
  } catch (error) {
    console.error("fetchSignal error:", error);
    return null;
  }
}

export async function fetchChart(
  symbol: "XAUUSD" | "XAGUSD",
  timeframe: string,
  limit: number = 120
): Promise<ChartResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(
      `/api/chart?symbol=${symbol}&tf=${timeframe}&limit=${limit}`,
      {},
      45000
    );

    if (!response.ok) {
      console.error("fetchChart failed:", response.status, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("fetchChart error:", error);
    return null;
  }
}

export async function fetchPositions(): Promise<PositionsResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/api/positions`, {}, 45000);

    if (!response.ok) {
      console.error("fetchPositions failed:", response.status, response.statusText);
      return { ok: true, count: 0, positions: [] };
    }

    const raw = await response.json();
    return normalizePositionsResponse(raw);
  } catch (error) {
    console.error("fetchPositions error:", error);
    return { ok: true, count: 0, positions: [] };
  }
}

export async function fetchTradeHistory(limit: number = 7): Promise<TradeHistoryResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/history?closed=true&limit=${limit}`, {}, 45000);

    if (!response.ok) {
      return { ok: true, count: 0, trades: [] };
    }

    return await response.json();
  } catch {
    return { ok: true, count: 0, trades: [] };
  }
}

export async function fetchTradeStats(): Promise<StatsResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/stats`, {}, 45000);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchTerminalData(
  symbol: "XAUUSD" | "XAGUSD"
): Promise<TerminalResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/terminal?symbol=${symbol}`, {}, 45000);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function prepareSignal(symbol: "XAUUSD" | "XAGUSD"): Promise<PrepareResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/api/signal?symbol=${symbol}`, {}, 45000);

    if (!response.ok) return null;

    const raw = await response.json();
    const normalized = normalizeDashboardSignal(raw);

    return {
      ok: !!normalized,
      signal: {
        symbol,
        side: normalized?.side ?? null,
        entry: normalized?.entry ?? null,
        sl: normalized?.sl ?? null,
        tp: normalized?.tp ?? null,
        rr: normalized?.rr ? String(normalized.rr) : null,
        confidence: normalized?.confidence ?? null,
        status: normalized?.status ?? "WAIT",
      },
    };
  } catch {
    return null;
  }
}

export async function fetchMT5History(limit: number = 7): Promise<MT5HistoryResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/history?limit=${limit}`, {}, 45000);

    if (!response.ok) {
      return { ok: true, count: 0, trades: [] };
    }

    return await response.json();
  } catch {
    return { ok: true, count: 0, trades: [] };
  }
}

export async function fetchDashboard(
  symbol: "XAUUSD" | "XAGUSD"
): Promise<DashboardResponse | null> {
  try {
    const response = await fetchJsonWithTimeout(`/api/dashboard?symbol=${symbol}`, {}, 45000);

    if (!response.ok) {
      console.error("fetchDashboard failed:", response.status, response.statusText);
      return null;
    }

    const raw = await response.json();

    return {
      ok: !!raw?.ok,
      signal: normalizeDashboardSignal(raw?.signal),
      prices: normalizeDashboardPrices(raw?.prices),
      positions: Array.isArray(raw?.positions) ? raw.positions : [],
      positions_count:
        typeof raw?.positions_count === "number"
          ? raw.positions_count
          : Array.isArray(raw?.positions)
          ? raw.positions.length
          : 0,
      market_context: normalizeDashboardMarketContext(raw?.market_context),
      meta: raw?.meta ?? null,
    };
  } catch (error) {
    console.error("fetchDashboard error:", error);
    return null;
  }
}

// ---------------- BEX per-user / VIP / admin API ----------------
async function appApiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(`${APP_API_BASE}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      mode: "cors",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const data = await safeJson<T>(response);
    if (!response.ok) return (data as T) || null;
    return data;
  } catch (error) {
    console.error("appApiRequest failed", path, error);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchMyVip(): Promise<VipMeResponse | null> {
  return appApiRequest<VipMeResponse>("/api/me/vip", {}, 30000);
}

export async function saveMyMt5Account(payload: { login_id: string; server: string; max_lot?: number; max_trades?: number; }): Promise<VipMeResponse | null> {
  return appApiRequest<VipMeResponse>("/api/me/mt5-account", { method: "POST", body: JSON.stringify(payload) }, 30000);
}

export async function fetchMyTrades(limit = 50): Promise<MT5HistoryResponse | null> {
  return appApiRequest<MT5HistoryResponse>(`/api/me/trades?limit=${encodeURIComponent(String(limit))}`, {}, 30000);
}

export async function fetchMyStats(): Promise<MyStatsResponse | null> {
  return appApiRequest<MyStatsResponse>("/api/me/stats", {}, 30000);
}

export async function fetchAdminCustomers(): Promise<AdminCustomersResponse | null> {
  return appApiRequest<AdminCustomersResponse>("/api/admin/customers", {}, 30000);
}

export async function adminGenerateToken(payload: { email: string; mt5_account_login: string; server?: string; max_lot?: number; max_trades?: number; }): Promise<any> {
  return appApiRequest<any>("/api/admin/generate-token", { method: "POST", body: JSON.stringify(payload) }, 30000);
}
