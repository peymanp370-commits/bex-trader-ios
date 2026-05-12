import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { SideMenu } from "../components/SideMenu";
import { BottomNav } from "../components/BottomNav";
import { AppHeader } from "../components/AppHeader";
import { fetchTradeHistory, ClosedTrade } from "../utils/api";

type SummaryItem = {
  symbol: string;
  trades_7d: number;
  trades_30d: number;
  wins_7d: number;
  wins_30d: number;
  losses_7d: number;
  losses_30d: number;
  flats_7d: number;
  flats_30d: number;
  winrate_7d: number;
  winrate_30d: number;
  total_pnl_7d: number;
  total_pnl_30d: number;
  avg_pnl_7d: number;
  avg_pnl_30d: number;
  updated_at: number;
};

type ReportHeadline = {
  symbol: string | null;
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  tp_hits: number;
  sl_hits: number;
  early_confidence_exits: number;
  management_exits: number;
  time_exits: number;
  break_even_exits: number;
};

type DailyBreakdownRow = {
  report_date: string;
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  total_pnl: number;
  avg_pnl: number;
  tp_hits: number;
  sl_hits: number;
  early_confidence_exits: number;
  management_exits: number;
  time_exits: number;
  break_even_exits: number;
  best_setup: string;
  worst_setup: string;
  updated_at: number;
};

type ReportResponse = {
  ok: boolean;
  period: "weekly" | "monthly";
  report: {
    headline: ReportHeadline;
    daily_breakdown: DailyBreakdownRow[];
  };
};

type PerformanceCard = {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "red" | "yellow";
};

type CompareBucket = {
  key?: string;
  trades?: number;
  wins?: number;
  losses?: number;
  flats?: number;
  net_pnl?: number;
  avg_pnl?: number;
};

type CompareResponse = {
  ok: boolean;
  current?: {
    headline?: {
      trades?: number;
      wins?: number;
      losses?: number;
      flats?: number;
      net_pnl?: number;
      avg_pnl?: number;
    };
    breakdowns?: {
      by_symbol?: CompareBucket[];
    };
  };
};

const STATS_TZ = "America/Toronto";
const DAY_MS = 24 * 60 * 60 * 1000;
const PUBLIC_STATS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // low-cost: max 4 refreshes/day
const PUBLIC_STATS_CACHE_PREFIX = "bex_public_stats_cache_v3";


function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtSigned(value: number, digits = 2) {
  const fixed = toNumber(value).toFixed(digits);
  return `${value > 0 ? "+" : ""}${fixed}`;
}

function fmtPercent(value: number, digits = 2) {
  return `${toNumber(value).toFixed(digits)}%`;
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString("en-US", { month: "short" });
}

function getReportApiBases(): string[] {
  const envBase =
    (import.meta as any)?.env?.VITE_REPORT_API_URL ||
    (import.meta as any)?.env?.VITE_REPORT_ENGINE_URL;

  const candidates = [
    envBase ? String(envBase).replace(/\/$/, "") : "",
    "https://bex-report-engine.peymanp370.workers.dev",
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function getApiBase(): string {
  return getReportApiBases()[0] || "https://bex-report-engine.peymanp370.workers.dev";
}

function getAppApiBase(): string {
  const envBase = (import.meta as any)?.env?.VITE_APP_API_URL;
  if (envBase) return String(envBase).replace(/\/$/, "");
  return "https://bex-app.peymanp370.workers.dev";
}

function torontoDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STATS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((part) => part.type === "year")?.value || "0000";
  const m = parts.find((part) => part.type === "month")?.value || "01";
  const d = parts.find((part) => part.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

function getTorontoDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STATS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string, fallback = "0") =>
    parts.find((part) => part.type === type)?.value || fallback;

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
  };
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
    0
  );

  return asUtc - (date.getTime() - date.getMilliseconds());
}

function torontoWallTimeToUtcMs(year: number, month: number, day: number, hour = 9): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(STATS_TZ, new Date(utcGuess));
  return utcGuess - offset;
}

function msUntilNextTorontoNine(now = new Date()): number {
  const parts = getTorontoDateTimeParts(now);
  let targetMs = torontoWallTimeToUtcMs(parts.year, parts.month, parts.day, 9);

  if (now.getTime() >= targetMs) {
    const tomorrowNoonUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 12, 0, 0, 0));
    const t = getTorontoDateTimeParts(tomorrowNoonUtc);
    targetMs = torontoWallTimeToUtcMs(t.year, t.month, t.day, 9);
  }

  return Math.max(1000, targetMs - now.getTime());
}

function reportDateToNoonUtcMs(reportDate: string): number {
  const n = new Date(`${reportDate}T16:00:00.000Z`).getTime();
  return Number.isFinite(n) ? n : Date.now();
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return torontoDateKey(new Date());
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function reportEngineNowForCompletedDay(reportDate: string): number {
  // Report Engine daily mode always returns the previous completed day relative to `now`.
  // To request 2026-04-23, send `now` inside 2026-04-24 Toronto time.
  return reportDateToNoonUtcMs(addDaysToDateKey(reportDate, 1));
}

function normalizeSymbol(value: unknown): "XAUUSD" | "XAGUSD" | null {
  const raw = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (raw.includes("XAUUSD") || raw === "GOLD") return "XAUUSD";
  if (raw.includes("XAGUSD") || raw === "SILVER") return "XAGUSD";
  return null;
}

function normalizeTradeCloseMs(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    return n < 10_000_000_000 ? n * 1000 : n;
  }

  const raw = String(value).trim();
  const parsed = Date.parse(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function completedTradingCutoffKey(): string {
  // The current Toronto day is still incomplete, so Daily Snapshot must stop at yesterday.
  return torontoDateKey(new Date(Date.now() - DAY_MS));
}

function freshDailyStartKey(daysBack = 14): string {
  // Never allow an old cached report like 2026-03-31 to become the visible
  // “latest completed day” when the live worker is only returning today.
  // Daily Snapshot must either show a recent completed day or say there is no data.
  return torontoDateKey(new Date(Date.now() - daysBack * DAY_MS));
}

function normalizeHistoryTrade(raw: any): ClosedTrade | null {
  const symbol = normalizeSymbol(raw?.symbol);
  if (!symbol) return null;

  const closeMs = normalizeTradeCloseMs(
    raw?.close_time ?? raw?.closed_at ?? raw?.closeTime ?? raw?.time_close ?? raw?.close_ms
  );
  if (!closeMs) return null;

  const profit = toNumber(
    raw?.profit ?? raw?.pnl_net ?? raw?.net_pnl ?? raw?.pnl ?? raw?.total_pnl ?? raw?.pnl_gross,
    0
  );

  return {
    symbol,
    side: String(raw?.side || raw?.entry_side_real || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
    volume: toNumber(raw?.volume, 0),
    entry_price: toNumber(raw?.entry_price ?? raw?.entry, 0),
    exit_price: toNumber(raw?.exit_price ?? raw?.exit, 0),
    profit,
    open_time: normalizeTradeCloseMs(raw?.open_time ?? raw?.opened_at ?? raw?.openTime),
    close_time: closeMs,
    status: "CLOSED",
  };
}

function extractTradesFromAnyShape(payload: any): ClosedTrade[] {
  const candidates = [
    payload?.positions,
    payload?.trades,
    payload?.items,
    payload?.rows,
    payload?.data?.positions,
    payload?.data?.trades,
    payload?.history,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map(normalizeHistoryTrade)
        .filter((trade): trade is ClosedTrade => !!trade);
    }
  }

  return [];
}

function mergeTrades(primary: ClosedTrade[], extra: ClosedTrade[]): ClosedTrade[] {
  const map = new Map<string, ClosedTrade>();
  for (const trade of [...primary, ...extra]) {
    const symbol = normalizeSymbol(trade.symbol);
    const closeMs = normalizeTradeCloseMs(trade.close_time);
    if (!symbol || !closeMs) continue;
    const key = `${symbol}:${closeMs}:${toNumber(trade.profit, 0).toFixed(2)}:${toNumber(trade.entry_price, 0).toFixed(2)}:${toNumber(trade.exit_price, 0).toFixed(2)}`;
    map.set(key, { ...trade, symbol, close_time: closeMs });
  }
  return Array.from(map.values()).sort((a, b) => normalizeTradeCloseMs(b.close_time) - normalizeTradeCloseMs(a.close_time));
}

async function fetchTradeHistoryDeep(limit = 10000): Promise<ClosedTrade[]> {
  const base = getAppApiBase();
  const cacheBust = Date.now();
  const appLimit = 1000;
  const paths = [
    // Current bex-app worker route. This is the main source for closed MT5 positions.
    `/api/positions?closed=true&limit=${appLimit}&complete_only=false&_=${cacheBust}`,
    // Older/fallback history route names, kept so old deploys still work.
    `/history?closed=true&limit=${limit}&sort=desc&order=desc&_=${cacheBust}`,
    `/history?status=CLOSED&limit=${limit}&sort=desc&order=desc&_=${cacheBust}`,
    `/api/history?closed=true&limit=${limit}&sort=desc&order=desc&_=${cacheBust}`,
  ];

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const res = await fetch(`${base}${path}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [] as ClosedTrade[];
      return extractTradesFromAnyShape(await res.json());
    })
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchOneReportEngineDay(dateKey: string): Promise<DailyBreakdownRow[]> {
  const urls: string[] = [];

  for (const base of getReportApiBases()) {
    const withNow = new URL(`${base}/report_v2`);
    withNow.searchParams.set("period", "daily");
    withNow.searchParams.set("tz", STATS_TZ);
    withNow.searchParams.set("fresh", "1");
    withNow.searchParams.set("now", String(reportEngineNowForCompletedDay(dateKey)));
    withNow.searchParams.set("_", String(Date.now()));
    urls.push(withNow.toString());

    // Extra safety for the latest completed day: if the report engine is already
    // patched, calling without `now` returns yesterday directly. This protects
    // the UI from any env/base mismatch or date math edge case.
    const latest = new URL(`${base}/report_v2`);
    latest.searchParams.set("period", "daily");
    latest.searchParams.set("tz", STATS_TZ);
    latest.searchParams.set("fresh", "1");
    latest.searchParams.set("_", String(Date.now()));
    urls.push(latest.toString());
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;

      const json = await res.json();
      const rows = Array.isArray(json?.report?.daily_breakdown) ? json.report.daily_breakdown : [];
      const normalized = rows
        .map((row: any) => {
          const reportDate = String(row?.report_date || json?.range?.current?.startDate || dateKey).slice(0, 10);
          if (reportDate !== dateKey) return null;
          const symbol = normalizeSymbol(row?.symbol);
          if (!symbol) return null;
          const trades = toNumber(row?.trades, 0);
          if (trades <= 0) return null;
          const totalPnl = toNumber(row?.total_pnl ?? row?.net_pnl ?? row?.pnl, 0);

          return {
            report_date: reportDate,
            symbol,
            trades,
            wins: toNumber(row?.wins, 0),
            losses: toNumber(row?.losses, 0),
            flats: toNumber(row?.flats, 0),
            total_pnl: totalPnl,
            avg_pnl: toNumber(row?.avg_pnl, trades > 0 ? totalPnl / trades : 0),
            tp_hits: toNumber(row?.tp_hits, 0),
            sl_hits: toNumber(row?.sl_hits, 0),
            early_confidence_exits: toNumber(row?.early_confidence_exits, 0),
            management_exits: toNumber(row?.management_exits, 0),
            time_exits: toNumber(row?.time_exits, 0),
            break_even_exits: toNumber(row?.break_even_exits, 0),
            best_setup: String(row?.best_setup || ""),
            worst_setup: String(row?.worst_setup || ""),
            updated_at: toNumber(row?.updated_at, Date.now()),
          } as DailyBreakdownRow;
        })
        .filter((row: DailyBreakdownRow | null): row is DailyBreakdownRow => !!row);

      if (normalized.length) return normalized;
    } catch {
      // Try next URL/base.
    }
  }

  return [];
}

async function fetchRawDailyRowsFromReportEngine(daysBack = 7): Promise<DailyBreakdownRow[]> {
  const normalizeFastRows = (rows: any[]) =>
    rows
      .map((row: any) => {
        const reportDate = String(row?.report_date || row?.day_key || row?.date || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return null;
        const symbol = normalizeSymbol(row?.symbol);
        if (!symbol) return null;
        const trades = toNumber(row?.trades, 0);
        if (trades <= 0) return null;
        const totalPnl = toNumber(row?.total_pnl ?? row?.net_pnl ?? row?.profit ?? row?.pnl, 0);
        const wins = toNumber(row?.wins, 0);
        const losses = toNumber(row?.losses, 0);
        const flats = toNumber(row?.flats, Math.max(0, trades - wins - losses));
        return {
          report_date: reportDate,
          symbol,
          trades,
          wins,
          losses,
          flats,
          total_pnl: totalPnl,
          avg_pnl: toNumber(row?.avg_pnl, trades > 0 ? totalPnl / trades : 0),
          tp_hits: toNumber(row?.tp_hits, 0),
          sl_hits: toNumber(row?.sl_hits, 0),
          early_confidence_exits: toNumber(row?.early_confidence_exits, 0),
          management_exits: toNumber(row?.management_exits, 0),
          time_exits: toNumber(row?.time_exits, 0),
          break_even_exits: toNumber(row?.break_even_exits, 0),
          best_setup: String(row?.best_setup || ""),
          worst_setup: String(row?.worst_setup || ""),
          updated_at: toNumber(row?.updated_at, reportDateToNoonUtcMs(reportDate)),
        } as DailyBreakdownRow;
      })
      .filter((row: DailyBreakdownRow | null): row is DailyBreakdownRow => !!row)
      .sort((a, b) => b.report_date.localeCompare(a.report_date) || a.symbol.localeCompare(b.symbol));

  const bases = Array.from(new Set([
    ...getReportApiBases(),
    "https://bex-report-engine.peymanp370.workers.dev",
  ].filter(Boolean)));

  for (const base of bases) {
    const url = new URL(`${base}/api/stats/daily`);
    url.searchParams.set("days", String(Math.max(7, Math.min(30, daysBack || 7))));
    url.searchParams.set("include_today", "false");
    url.searchParams.set("tz", STATS_TZ);
    url.searchParams.set("_", String(Date.now()));

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;

      const json = await res.json();
      const rows = Array.isArray(json?.daily_rows) ? json.daily_rows : Array.isArray(json?.rows) ? json.rows : [];
      const normalized = normalizeFastRows(rows);
      if (normalized.length) return normalized;
    } catch {
      // Try next configured base.
    } finally {
      window.clearTimeout(timer);
    }
  }

  return [];
}

async function fetchAppStatsSummaryRows(daysBack = 45): Promise<DailyBreakdownRow[]> {
  const base = getAppApiBase();
  const now = Date.now();

  const normalizeRows = (rows: any[], fallbackSymbol = "ALL") => {
    return rows
      .map((row: any) => {
        const reportDate = String(row?.report_date || row?.day_key || row?.date || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return null;
        if (reportDate > completedTradingCutoffKey()) return null;
        if (reportDate < torontoDateKey(new Date(now - daysBack * DAY_MS))) return null;
        const symbol = normalizeSymbol(row?.symbol) || fallbackSymbol;
        const trades = toNumber(row?.trades ?? row?.count, 0);
        if (trades <= 0) return null;
        const totalPnl = toNumber(row?.total_pnl ?? row?.net_pips ?? row?.net_pnl ?? row?.profit ?? row?.pnl, 0);
        const wins = toNumber(row?.wins, 0);
        const losses = toNumber(row?.losses, 0);
        const flats = Math.max(0, toNumber(row?.flats, trades - wins - losses));
        return {
          report_date: reportDate,
          symbol,
          trades,
          wins,
          losses,
          flats,
          total_pnl: totalPnl,
          avg_pnl: trades > 0 ? totalPnl / trades : 0,
          tp_hits: toNumber(row?.tp_hits, 0),
          sl_hits: toNumber(row?.sl_hits, 0),
          early_confidence_exits: toNumber(row?.early_confidence_exits, 0),
          management_exits: toNumber(row?.management_exits, 0),
          time_exits: toNumber(row?.time_exits, 0),
          break_even_exits: toNumber(row?.break_even_exits, 0),
          best_setup: String(row?.best_setup || ""),
          worst_setup: String(row?.worst_setup || ""),
          updated_at: toNumber(row?.updated_at, reportDateToNoonUtcMs(reportDate)),
        } as DailyBreakdownRow;
      })
      .filter((row: DailyBreakdownRow | null): row is DailyBreakdownRow => !!row);
  };

  async function loadDailyEndpoint(): Promise<DailyBreakdownRow[]> {
    try {
      const url = new URL(base + "/api/stats/daily");
      url.searchParams.set("days", String(daysBack));
      url.searchParams.set("include_today", "false");
      url.searchParams.set("_", String(Date.now()));
      const res = await fetch(url.toString(), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const json = await res.json();
      const rows = Array.isArray(json?.daily_rows) ? json.daily_rows : Array.isArray(json?.rows) ? json.rows : [];
      return normalizeRows(rows);
    } catch {
      return [];
    }
  }

  async function loadSummaryFallback(): Promise<DailyBreakdownRow[]> {
    const months: string[] = [];
    const seen = new Set<string>();
    const dNow = new Date();
    for (let i = 0; i <= 3; i += 1) {
      const d = new Date(dNow.getFullYear(), dNow.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (!seen.has(key)) { seen.add(key); months.push(key); }
    }
    const responses = await Promise.allSettled(months.map(async (monthKey) => {
      const url = new URL(base + "/api/stats/summary");
      url.searchParams.set("month", monthKey);
      url.searchParams.set("_", String(Date.now()));
      const res = await fetch(url.toString(), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) return [] as DailyBreakdownRow[];
      const json = await res.json();
      const rows = Array.isArray(json?.daily_rows) ? json.daily_rows : [];
      return normalizeRows(rows, "ALL");
    }));
    return responses.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }

  const [dailyEndpointRows, summaryRows] = await Promise.allSettled([loadDailyEndpoint(), loadSummaryFallback()]);
  const map = new Map<string, DailyBreakdownRow>();
  const put = (row: DailyBreakdownRow) => {
    const key = row.report_date + ":" + row.symbol;
    const prev = map.get(key);
    if (!prev || toNumber(row.updated_at) >= toNumber(prev.updated_at) || toNumber(row.trades) >= toNumber(prev.trades)) map.set(key, row);
  };
  if (dailyEndpointRows.status === "fulfilled") dailyEndpointRows.value.forEach(put);
  if (summaryRows.status === "fulfilled") summaryRows.value.forEach(put);
  return Array.from(map.values()).sort((a, b) => b.report_date.localeCompare(a.report_date) || a.symbol.localeCompare(b.symbol));
}

async function fetchFreshDailyRows(daysBack = 45, selectedSymbol?: "XAUUSD" | "XAGUSD"): Promise<DailyBreakdownRow[]> {
  const freshStart = freshDailyStartKey(21);
  const cutoff = completedTradingCutoffKey();
  const wanted = selectedSymbol || "ALL";

  const clean = (rows: DailyBreakdownRow[]) =>
    rows
      .filter((row) => {
        const date = String(row?.report_date || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        if (date > cutoff || date < freshStart) return false;
        if (wanted !== "ALL" && row.symbol !== wanted) return false;
        return toNumber(row.trades) > 0;
      })
      .map((row) => ({
        ...row,
        report_date: String(row.report_date).slice(0, 10),
        trades: toNumber(row.trades, 0),
        wins: toNumber(row.wins, 0),
        losses: toNumber(row.losses, 0),
        flats: toNumber(row.flats, 0),
        total_pnl: toNumber(row.total_pnl, 0),
        avg_pnl: toNumber(row.avg_pnl, toNumber(row.trades) > 0 ? toNumber(row.total_pnl) / toNumber(row.trades) : 0),
        tp_hits: toNumber(row.tp_hits, 0),
        sl_hits: toNumber(row.sl_hits, 0),
        early_confidence_exits: toNumber(row.early_confidence_exits, 0),
        management_exits: toNumber(row.management_exits, 0),
        time_exits: toNumber(row.time_exits, 0),
        break_even_exits: toNumber(row.break_even_exits, 0),
        updated_at: toNumber(row.updated_at, Date.now()),
      }));

  // Main path: one fast single-query endpoint on report-engine.
  // This avoids 7+ slow report requests and avoids the app endpoint stale/empty issue.
  const reportRows = clean(await fetchRawDailyRowsFromReportEngine(7));
  if (reportRows.length) return pickLastCompletedDays(reportRows, 7);

  // Fallback only if report-engine endpoint is not deployed yet.
  const appRows = clean(await fetchAppStatsSummaryRows(daysBack));
  if (appRows.length) return pickLastCompletedDays(appRows, 7);

  return [];
}

function pickLastCompletedDays(rows: DailyBreakdownRow[], days = 7): DailyBreakdownRow[] {
  const map = new Map<string, DailyBreakdownRow>();
  for (const row of rows) {
    const key = `${row.report_date}:${row.symbol}`;
    const prev = map.get(key);
    if (!prev || toNumber(row.updated_at) >= toNumber(prev.updated_at) || toNumber(row.trades) >= toNumber(prev.trades)) {
      map.set(key, row);
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) =>
    b.report_date.localeCompare(a.report_date) || a.symbol.localeCompare(b.symbol)
  );

  const selectedDates: string[] = [];
  for (const row of sorted) {
    if (!selectedDates.includes(row.report_date)) selectedDates.push(row.report_date);
    if (selectedDates.length >= days) break;
  }

  return sorted.filter((row) => selectedDates.includes(row.report_date));
}

async function fetchSummary(symbol?: string): Promise<SummaryItem[]> {
  const base = getApiBase();
  const url = new URL(`${base}/summary_v2`);
  if (symbol) url.searchParams.set("symbol", symbol);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`summary_v2 failed: ${res.status}`);

  const json = await res.json();
  return Array.isArray(json?.items) ? json.items : [];
}

async function fetchReport(
  period: "weekly" | "monthly",
  symbol?: string
): Promise<ReportResponse> {
  const base = getApiBase();
  const url = new URL(`${base}/report_v2`);
  url.searchParams.set("period", period);
  if (symbol) url.searchParams.set("symbol", symbol);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`report_v2 failed: ${res.status}`);

  return await res.json();
}

function cardToneClass(tone?: "neutral" | "green" | "red" | "yellow") {
  if (tone === "green") return "text-green-400";
  if (tone === "red") return "text-red-400";
  if (tone === "yellow") return "text-yellow-400";
  return "";
}


function emptySummary(symbol: string): SummaryItem {
  return {
    symbol,
    trades_7d: 0,
    trades_30d: 0,
    wins_7d: 0,
    wins_30d: 0,
    losses_7d: 0,
    losses_30d: 0,
    flats_7d: 0,
    flats_30d: 0,
    winrate_7d: 0,
    winrate_30d: 0,
    total_pnl_7d: 0,
    total_pnl_30d: 0,
    avg_pnl_7d: 0,
    avg_pnl_30d: 0,
    updated_at: 0,
  };
}

function finalizeSummary(item: SummaryItem): SummaryItem {
  item.winrate_7d = item.trades_7d > 0 ? (item.wins_7d / item.trades_7d) * 100 : 0;
  item.winrate_30d = item.trades_30d > 0 ? (item.wins_30d / item.trades_30d) * 100 : 0;
  item.avg_pnl_7d = item.trades_7d > 0 ? item.total_pnl_7d / item.trades_7d : 0;
  item.avg_pnl_30d = item.trades_30d > 0 ? item.total_pnl_30d / item.trades_30d : 0;
  return item;
}

function chooseFreshSummary(live: SummaryItem | null | undefined, cached: SummaryItem | null | undefined, scope: "7d" | "30d"): SummaryItem | null {
  if (!live) return cached || null;
  if (!cached) return live;

  const liveTrades = scope === "7d" ? live.trades_7d : live.trades_30d;
  const cachedTrades = scope === "7d" ? cached.trades_7d : cached.trades_30d;

  // MT5 history is the source of truth when it has a newer close time, even if the cached report has more old rows.
  if (toNumber(live.updated_at) >= toNumber(cached.updated_at)) return live;
  if (liveTrades >= cachedTrades) return live;
  return cached;
}

export function Stats() {
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  const [loading, setLoading] = useState(true);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<ReportResponse | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<ReportResponse | null>(null);
  const [recentTrades, setRecentTrades] = useState<ClosedTrade[]>([]);
  const [deepDailyRows, setDeepDailyRows] = useState<DailyBreakdownRow[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<"ALL" | "XAUUSD" | "XAGUSD">("ALL");
  const [selectedScope, setSelectedScope] = useState<"7d" | "30d">("30d");
  const [lastError, setLastError] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;
    let refreshTimer: number | undefined;
    let lastSuccessfulLoadAt = 0;
    const cacheKey = `${PUBLIC_STATS_CACHE_PREFIX}:${selectedSymbol}`;

    const applyCache = (cached: any) => {
      if (!cached || typeof cached !== "object") return false;
      setSummaryItems(Array.isArray(cached.summaryItems) ? cached.summaryItems : []);
      setWeeklyReport(cached.weeklyReport || null);
      setMonthlyReport(cached.monthlyReport || null);
      setRecentTrades(Array.isArray(cached.recentTrades) ? cached.recentTrades : []);
      setDeepDailyRows(Array.isArray(cached.deepDailyRows) ? cached.deepDailyRows : []);
      setLastError(cached.lastError || null);
      if (cached.savedAt) lastSuccessfulLoadAt = Number(cached.savedAt) || 0;
      return true;
    };

    const readCache = () => {
      try {
        const raw = localStorage.getItem(cacheKey);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const writeCache = (payload: any) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ...payload, savedAt: Date.now() }));
      } catch {}
    };

    const loadStats = async (showLoading = true, force = false) => {
      const cached = readCache();
      const cacheAge = cached?.savedAt ? Date.now() - Number(cached.savedAt) : Infinity;

      if (cached && mounted) {
        applyCache(cached);
        setLoading(false);
      }

      // Public Stats is a low-cost marketing page. Do not hit APIs on every page visit.
      // It refreshes at most every 6 hours (4x/day) unless the user has no cache yet.
      if (!force && cached && cacheAge < PUBLIC_STATS_CACHE_TTL_MS) {
        return;
      }

      try {
        if (showLoading && !cached) setLoading(true);
        setLastError(null);

        const symbolArg = selectedSymbol === "ALL" ? undefined : selectedSymbol;

        const [summaryResult, weeklyResult, monthlyResult, rawDailyRowsResult] = await Promise.allSettled([
          fetchSummary(symbolArg),
          fetchReport("weekly", symbolArg),
          fetchReport("monthly", symbolArg),
          fetchFreshDailyRows(21, symbolArg),
        ]);

        if (!mounted) return;

        const summary = summaryResult.status === "fulfilled" ? summaryResult.value : cached?.summaryItems || [];
        const weekly = weeklyResult.status === "fulfilled" ? weeklyResult.value : cached?.weeklyReport || null;
        const monthly = monthlyResult.status === "fulfilled" ? monthlyResult.value : cached?.monthlyReport || null;
        const rawDailyRows = rawDailyRowsResult.status === "fulfilled" ? rawDailyRowsResult.value : cached?.deepDailyRows || [];

        // Important: do NOT call bex-app /history here. That endpoint is not the public stats source
        // and causes 404 spam + extra cost. Public Stats must come from cached report/summary workers only.
        const recent: ClosedTrade[] = Array.isArray(cached?.recentTrades) ? cached.recentTrades : [];

        const errors = [summaryResult, weeklyResult, monthlyResult, rawDailyRowsResult]
          .filter((r) => r.status === "rejected")
          .map((r: any) => r.reason?.message || String(r.reason));
        const nextError = errors.length ? errors.join(" | ") : null;

        setSummaryItems(Array.isArray(summary) ? summary : []);
        setWeeklyReport(weekly);
        setMonthlyReport(monthly);
        setRecentTrades(recent);
        setDeepDailyRows(Array.isArray(rawDailyRows) ? rawDailyRows : []);
        setLastError(nextError);
        lastSuccessfulLoadAt = Date.now();

        writeCache({
          summaryItems: Array.isArray(summary) ? summary : [],
          weeklyReport: weekly,
          monthlyReport: monthly,
          recentTrades: recent,
          deepDailyRows: Array.isArray(rawDailyRows) ? rawDailyRows : [],
          lastError: nextError,
        });
      } catch (err: any) {
        if (!mounted) return;
        const cachedAgain = readCache();
        if (cachedAgain) {
          applyCache(cachedAgain);
          setLastError(null);
        } else {
          setLastError(err?.message || "Failed to load stats");
          setSummaryItems([]);
          setWeeklyReport(null);
          setMonthlyReport(null);
          setRecentTrades([]);
          setDeepDailyRows([]);
        }
      } finally {
        if (mounted && showLoading) setLoading(false);
      }
    };

    const scheduleNextLowCostRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        if (!mounted) return;
        await loadStats(false, true);
        if (mounted) scheduleNextLowCostRefresh();
      }, PUBLIC_STATS_CACHE_TTL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const staleForSixHours = Date.now() - lastSuccessfulLoadAt > PUBLIC_STATS_CACHE_TTL_MS;
      if (staleForSixHours) loadStats(false, true);
    };

    loadStats();
    scheduleNextLowCostRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedSymbol]);

  const liveDailyRows = useMemo(() => {
    const now = Date.now();
    const groups = new Map<string, DailyBreakdownRow>();
    const toMs = (value: unknown) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return n < 10_000_000_000 ? n * 1000 : n;
    };

    for (const trade of recentTrades) {
      const symbol = String(trade.symbol || "").toUpperCase();
      if (symbol !== "XAUUSD" && symbol !== "XAGUSD") continue;
      if (selectedSymbol !== "ALL" && symbol !== selectedSymbol) continue;

      const closeMs = toMs(trade.close_time);
      if (!closeMs) continue;

      const reportDate = torontoDateKey(new Date(closeMs));
      const key = `${reportDate}:${symbol}`;
      const pnl = toNumber(trade.profit);
      const row = groups.get(key) || {
        report_date: reportDate,
        symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        flats: 0,
        total_pnl: 0,
        avg_pnl: 0,
        tp_hits: 0,
        sl_hits: 0,
        early_confidence_exits: 0,
        management_exits: 0,
        time_exits: 0,
        break_even_exits: 0,
        best_setup: "",
        worst_setup: "",
        updated_at: now,
      };

      row.trades += 1;
      row.total_pnl += pnl;
      if (pnl > 0) row.wins += 1;
      else if (pnl < 0) row.losses += 1;
      else row.flats += 1;
      row.avg_pnl = row.trades > 0 ? row.total_pnl / row.trades : 0;
      row.updated_at = Math.max(row.updated_at, closeMs);
      groups.set(key, row);
    }

    return Array.from(groups.values()).sort((a, b) =>
      b.report_date.localeCompare(a.report_date) || a.symbol.localeCompare(b.symbol)
    );
  }, [recentTrades, selectedSymbol]);

  const cachedSummaryBySymbol = useMemo(() => {
    const map = new Map<string, SummaryItem>();
    for (const item of summaryItems) {
      if (item?.symbol) map.set(String(item.symbol).toUpperCase(), item);
    }

    const all = summaryItems.reduce<SummaryItem>((acc, item) => {
      acc.trades_7d += toNumber(item.trades_7d);
      acc.trades_30d += toNumber(item.trades_30d);
      acc.wins_7d += toNumber(item.wins_7d);
      acc.wins_30d += toNumber(item.wins_30d);
      acc.losses_7d += toNumber(item.losses_7d);
      acc.losses_30d += toNumber(item.losses_30d);
      acc.flats_7d += toNumber(item.flats_7d);
      acc.flats_30d += toNumber(item.flats_30d);
      acc.total_pnl_7d += toNumber(item.total_pnl_7d);
      acc.total_pnl_30d += toNumber(item.total_pnl_30d);
      acc.updated_at = Math.max(acc.updated_at, toNumber(item.updated_at));
      return acc;
    }, emptySummary("ALL"));

    if (summaryItems.length) map.set("ALL", finalizeSummary(all));
    return map;
  }, [summaryItems]);

  const liveSummaryBySymbol = useMemo(() => {
    const now = new Date();
    const start7 = new Date(now);
    start7.setDate(start7.getDate() - 7);
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const toMs = (value: unknown) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return n < 10_000_000_000 ? n * 1000 : n;
    };

    const map = new Map<string, SummaryItem>([
      ["XAUUSD", emptySummary("XAUUSD")],
      ["XAGUSD", emptySummary("XAGUSD")],
      ["ALL", emptySummary("ALL")],
    ]);

    for (const trade of recentTrades) {
      const symbol = String(trade.symbol || "").toUpperCase();
      if (symbol !== "XAUUSD" && symbol !== "XAGUSD") continue;
      const closeMs = toMs(trade.close_time);
      if (!closeMs) continue;
      const closedAt = new Date(closeMs);
      const pnl = toNumber(trade.profit);

      for (const key of [symbol, "ALL"]) {
        const out = map.get(key) || emptySummary(key);
        if (closedAt >= start30) {
          out.trades_30d += 1;
          out.total_pnl_30d += pnl;
          if (pnl > 0) out.wins_30d += 1;
          else if (pnl < 0) out.losses_30d += 1;
          else out.flats_30d += 1;
        }
        if (closedAt >= start7) {
          out.trades_7d += 1;
          out.total_pnl_7d += pnl;
          if (pnl > 0) out.wins_7d += 1;
          else if (pnl < 0) out.losses_7d += 1;
          else out.flats_7d += 1;
        }
        out.updated_at = Math.max(out.updated_at, closeMs);
        map.set(key, out);
      }
    }

    for (const [key, item] of map) map.set(key, finalizeSummary(item));
    return map;
  }, [recentTrades]);


  const deepSummaryBySymbol = useMemo(() => {
    const now = new Date();
    const start7Key = torontoDateKey(new Date(now.getTime() - 7 * DAY_MS));
    const start30Key = torontoDateKey(new Date(now.getTime() - 30 * DAY_MS));
    const map = new Map<string, SummaryItem>([
      ["XAUUSD", emptySummary("XAUUSD")],
      ["XAGUSD", emptySummary("XAGUSD")],
      ["ALL", emptySummary("ALL")],
    ]);

    for (const row of deepDailyRows) {
      const symbol = normalizeSymbol(row.symbol);
      if (!symbol) continue;
      const dateKey = String(row.report_date || "");
      const trades = toNumber(row.trades);
      const wins = toNumber(row.wins);
      const losses = toNumber(row.losses);
      const flats = toNumber(row.flats);
      const pnl = toNumber(row.total_pnl);

      for (const key of [symbol, "ALL"] as const) {
        const out = map.get(key) || emptySummary(key);
        if (dateKey >= start30Key) {
          out.trades_30d += trades;
          out.wins_30d += wins;
          out.losses_30d += losses;
          out.flats_30d += flats;
          out.total_pnl_30d += pnl;
        }
        if (dateKey >= start7Key) {
          out.trades_7d += trades;
          out.wins_7d += wins;
          out.losses_7d += losses;
          out.flats_7d += flats;
          out.total_pnl_7d += pnl;
        }
        out.updated_at = Math.max(out.updated_at, toNumber(row.updated_at));
        map.set(key, out);
      }
    }

    for (const [key, item] of map) map.set(key, finalizeSummary(item));
    return map;
  }, [deepDailyRows]);

  const selectedSummary = useMemo(() => {
    return cachedSummaryBySymbol.get(selectedSymbol) || null;
  }, [cachedSummaryBySymbol, selectedSymbol]);

  const effectiveSummary = useMemo(() => {
    const live = chooseFreshSummary(deepSummaryBySymbol.get(selectedSymbol), liveSummaryBySymbol.get(selectedSymbol), selectedScope);
    return chooseFreshSummary(live, selectedSummary, selectedScope);
  }, [deepSummaryBySymbol, liveSummaryBySymbol, selectedSummary, selectedScope, selectedSymbol]);

  const summaryStats = useMemo(() => {
    if (!effectiveSummary) {
      return [
        { label: "Total Trades", value: "0" },
        { label: "Win Rate", value: "0%" },
        { label: "Net PnL", value: "0.00" },
        { label: "Avg Trade", value: "0.00" },
      ] as PerformanceCard[];
    }

    const trades =
      selectedScope === "7d"
        ? toNumber(effectiveSummary.trades_7d)
        : toNumber(effectiveSummary.trades_30d);

    const wins =
      selectedScope === "7d"
        ? toNumber(effectiveSummary.wins_7d)
        : toNumber(effectiveSummary.wins_30d);

    const totalPnl =
      selectedScope === "7d"
        ? toNumber(effectiveSummary.total_pnl_7d)
        : toNumber(effectiveSummary.total_pnl_30d);

    const avgTrade = trades > 0 ? totalPnl / trades : 0;
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;

    return [
      { label: "Total Trades", value: String(trades) },
      {
        label: "Win Rate",
        value: fmtPercent(winRate, 2),
        tone: winRate >= 55 ? "green" : winRate < 45 ? "red" : "yellow",
      },
      {
        label: "Net PnL",
        value: fmtSigned(totalPnl, 2),
        tone: totalPnl >= 0 ? "green" : "red",
      },
      {
        label: "Avg Trade",
        value: fmtSigned(avgTrade, 2),
        tone: avgTrade >= 0 ? "green" : "red",
      },
    ] as PerformanceCard[];
  }, [effectiveSummary, selectedScope]);

  const dailyRows = useMemo(() => {
    const cutoffKey = completedTradingCutoffKey();
    const freshStartKey = freshDailyStartKey(14);
    const isCompletedRecent = (row: DailyBreakdownRow) =>
      !!row?.report_date &&
      String(row.report_date) <= cutoffKey &&
      String(row.report_date) >= freshStartKey;

    // DAILY SNAPSHOT SOURCE OF TRUTH:
    // Do not use monthlyReport/report_v2 cache here. That stale cache is what kept
    // showing 2026-03-31 after the real date had moved to 2026-04-24.
    // Only live MT5 history + fresh daily compare rows are allowed in this section.
    const completedDeepRows = deepDailyRows.filter(isCompletedRecent);
    const completedLiveRows = liveDailyRows.filter(isCompletedRecent);

    const map = new Map<string, DailyBreakdownRow>();

    for (const row of completedDeepRows) {
      if (selectedSymbol !== "ALL" && row.symbol !== selectedSymbol) continue;
      map.set(`${row.report_date}:${row.symbol}`, row);
    }

    for (const row of completedLiveRows) {
      if (selectedSymbol !== "ALL" && row.symbol !== selectedSymbol) continue;
      const key = `${row.report_date}:${row.symbol}`;
      if (!map.has(key)) map.set(key, row);
    }

    const mergedRows = Array.from(map.values()).sort((a, b) =>
      b.report_date.localeCompare(a.report_date) || a.symbol.localeCompare(b.symbol)
    );

    const uniqueDates: string[] = [];
    for (const row of mergedRows) {
      if (!uniqueDates.includes(row.report_date)) uniqueDates.push(row.report_date);
      if (uniqueDates.length === 7) break;
    }

    return mergedRows.filter((row) => uniqueDates.includes(row.report_date));
  }, [liveDailyRows, deepDailyRows, selectedSymbol]);

  const effectiveDay = useMemo(() => {
    if (!dailyRows.length) return null;

    const firstDate = dailyRows[0].report_date;
    const sameDayRows = dailyRows.filter((row) => row.report_date === firstDate);

    const merged = sameDayRows.reduce<DailyBreakdownRow>(
      (acc, row) => ({
        report_date: firstDate,
        symbol: selectedSymbol === "ALL" ? "ALL" : row.symbol,
        trades: acc.trades + toNumber(row.trades),
        wins: acc.wins + toNumber(row.wins),
        losses: acc.losses + toNumber(row.losses),
        flats: acc.flats + toNumber(row.flats),
        total_pnl: acc.total_pnl + toNumber(row.total_pnl),
        avg_pnl: 0,
        tp_hits: acc.tp_hits + toNumber(row.tp_hits),
        sl_hits: acc.sl_hits + toNumber(row.sl_hits),
        early_confidence_exits: acc.early_confidence_exits + toNumber(row.early_confidence_exits),
        management_exits: acc.management_exits + toNumber(row.management_exits),
        time_exits: acc.time_exits + toNumber(row.time_exits),
        break_even_exits: acc.break_even_exits + toNumber(row.break_even_exits),
        best_setup: "",
        worst_setup: "",
        updated_at: Math.max(acc.updated_at, toNumber(row.updated_at)),
      }),
      {
        report_date: firstDate,
        symbol: selectedSymbol === "ALL" ? "ALL" : sameDayRows[0].symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        flats: 0,
        total_pnl: 0,
        avg_pnl: 0,
        tp_hits: 0,
        sl_hits: 0,
        early_confidence_exits: 0,
        management_exits: 0,
        time_exits: 0,
        break_even_exits: 0,
        best_setup: "",
        worst_setup: "",
        updated_at: 0,
      }
    );

    return {
      ...merged,
      avg_pnl: merged.trades > 0 ? merged.total_pnl / merged.trades : 0,
    };
  }, [dailyRows, selectedSymbol]);

  const monthRows = useMemo(() => {
    const cachedRows = monthlyReport?.report?.daily_breakdown || [];
    const deepKeys = new Set(deepDailyRows.map((row) => `${row.report_date}:${row.symbol}`));
    const primaryRows = [
      ...deepDailyRows,
      ...liveDailyRows.filter((row) => !deepKeys.has(`${row.report_date}:${row.symbol}`)),
    ];
    const primaryKeys = new Set(primaryRows.map((row) => `${row.report_date}:${row.symbol}`));
    const source = [
      ...primaryRows,
      ...cachedRows.filter((row) => !primaryKeys.has(`${row.report_date}:${row.symbol}`)),
    ].filter((row) => selectedSymbol === "ALL" || row.symbol === selectedSymbol);
    if (!source.length) return [];

    const grouped = new Map<
      string,
      { monthKey: string; label: string; trades: number; total_pnl: number }
    >();

    source.forEach((row) => {
      const date = String(row.report_date || "");
      const monthKey = date.slice(0, 7);
      if (!monthKey) return;

      const existing = grouped.get(monthKey) || {
        monthKey,
        label: monthLabelFromKey(monthKey),
        trades: 0,
        total_pnl: 0,
      };

      existing.trades += toNumber(row.trades);
      existing.total_pnl += toNumber(row.total_pnl);
      grouped.set(monthKey, existing);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );
  }, [monthlyReport, liveDailyRows, deepDailyRows, selectedSymbol]);

  const insightCards = useMemo(() => {
    if (!effectiveDay) return [];

    const trades = toNumber(effectiveDay.trades);
    const wins = toNumber(effectiveDay.wins);
    const losses = toNumber(effectiveDay.losses);
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;

    return [
      {
        label: "Previous Day Trades",
        value: String(trades),
        tone: "neutral" as const,
      },
      {
        label: "Previous Day Win Rate",
        value: fmtPercent(winRate, 2),
        tone:
          winRate >= 55
            ? ("green" as const)
            : winRate < 45
            ? ("red" as const)
            : ("yellow" as const),
      },
      {
        label: "Previous Day Net PnL",
        value: fmtSigned(toNumber(effectiveDay.total_pnl), 2),
        tone: toNumber(effectiveDay.total_pnl) >= 0 ? ("green" as const) : ("red" as const),
      },
      {
        label: "Wins / Losses",
        value: `${wins} / ${losses}`,
        tone: "neutral" as const,
      },
    ];
  }, [effectiveDay]);

  const effectiveSymbolRows = useMemo(() => {
    return (["XAUUSD", "XAGUSD"] as const)
      .map((symbol) => chooseFreshSummary(chooseFreshSummary(deepSummaryBySymbol.get(symbol), liveSummaryBySymbol.get(symbol), selectedScope), cachedSummaryBySymbol.get(symbol), selectedScope))
      .filter((item): item is SummaryItem => !!item && ((selectedScope === "7d" ? item.trades_7d : item.trades_30d) > 0));
  }, [deepSummaryBySymbol, liveSummaryBySymbol, cachedSummaryBySymbol, selectedScope]);

  const dailyLabel = effectiveDay ? effectiveDay.report_date : "Previous 7 Trading Days";

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-[#0a0e1a] text-white" : "bg-gray-50 text-gray-900"
      } pb-24`}
    >
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
<AppHeader
        title="Stats"
        subtitle="Public system performance"
        darkMode={darkMode}
        onMenuClick={() => setShowMenu(true)}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", JSON.stringify(next)); window.dispatchEvent(new Event("themeChange")); }}
        showSettings={true}
        showThemeToggle={true}
      />

      <div className="p-4 space-y-5">
        <div
          className={`rounded-2xl border p-4 text-sm ${
            darkMode
              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
              : "border-yellow-300/50 bg-yellow-50 text-yellow-900"
          }`}
        >
          Public BEX system performance for marketing. This is not a customer personal MT5 account. Use My Stats for your own trades.
        </div>
        <div
          className={`${
            darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"
          } rounded-2xl p-5 border`}
        >
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest">
              📊 OVERVIEW
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedSymbol}
                onChange={(e) =>
                  setSelectedSymbol(e.target.value as "ALL" | "XAUUSD" | "XAGUSD")
                }
                className={`${
                  darkMode
                    ? "bg-[#1a2332] border-gray-700 text-white"
                    : "bg-gray-100 border-gray-300 text-gray-900"
                } border rounded-lg px-3 py-2 text-sm`}
              >
                <option value="ALL">ALL</option>
                <option value="XAUUSD">XAUUSD</option>
                <option value="XAGUSD">XAGUSD</option>
              </select>

              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value as "7d" | "30d")}
                className={`${
                  darkMode
                    ? "bg-[#1a2332] border-gray-700 text-white"
                    : "bg-gray-100 border-gray-300 text-gray-900"
                } border rounded-lg px-3 py-2 text-sm`}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {summaryStats.map((stat, index) => (
              <div
                key={index}
                className={`${
                  darkMode
                    ? "bg-[#1a2332]/50 border-gray-800/50"
                    : "bg-gray-50 border-gray-200"
                } rounded-xl p-4 border`}
              >
                <p
                  className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  } mb-2`}
                >
                  {stat.label}
                </p>
                <p className={`font-bold text-2xl ${cardToneClass(stat.tone)}`}>
                  {loading ? "—" : stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${
            darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"
          } rounded-2xl p-5 border`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest">
              🗓️ DAILY SNAPSHOT
            </h2>
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {dailyLabel}
            </div>
          </div>

          <div className={`text-xs mb-4 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {insightCards.map((card, index) => (
              <div
                key={index}
                className={`${
                  darkMode
                    ? "bg-[#1a2332]/50 border-gray-800/50"
                    : "bg-gray-50 border-gray-200"
                } rounded-xl p-4 border`}
              >
                <p
                  className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  } mb-2`}
                >
                  {card.label}
                </p>
                <p className={`font-bold text-2xl ${cardToneClass(card.tone)}`}>
                  {loading ? "—" : card.value}
                </p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading daily report...</div>
          ) : dailyRows.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No daily data available</div>
          ) : (
            <div className="space-y-3">
              {dailyRows.map((row, index) => (
                <div
                  key={`${row.report_date}-${row.symbol}-${index}`}
                  className={`${
                    darkMode
                      ? "bg-[#1a2332]/50 border-gray-800/50"
                      : "bg-gray-50 border-gray-200"
                  } rounded-xl p-4 border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">
                      {row.report_date}{selectedSymbol === "ALL" && row.symbol !== "ALL" ? ` • ${row.symbol}` : ""}
                    </h3>
                    <span
                      className={`font-bold text-lg ${
                        toNumber(row.total_pnl) >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtSigned(toNumber(row.total_pnl), 2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm gap-3 flex-wrap">
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      {selectedSymbol === "ALL" && row.symbol !== "ALL" ? `${row.symbol} • ` : ""}
                      {toNumber(row.trades)} trades
                    </span>
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      Wins: {toNumber(row.wins)} • Losses: {toNumber(row.losses)}
                    </span>
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      Avg: {fmtSigned(toNumber(row.avg_pnl), 2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`${
            darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"
          } rounded-2xl p-5 border`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest">
              📆 MONTHLY SUMMARY
            </h2>
            <CalendarDays className="w-4 h-4 text-yellow-400" />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading monthly summary...</div>
          ) : monthRows.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No monthly data available</div>
          ) : (
            <div className="space-y-3">
              {monthRows.map((row) => (
                <div
                  key={row.monthKey}
                  className={`${
                    darkMode
                      ? "bg-[#1a2332]/50 border-gray-800/50"
                      : "bg-gray-50 border-gray-200"
                  } rounded-xl p-4 border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{row.label}</h3>
                    <span
                      className={`font-bold text-lg ${
                        toNumber(row.total_pnl) >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtSigned(toNumber(row.total_pnl), 2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      {toNumber(row.trades)} trades in {row.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lastError && (
          <div
            className={`${
              darkMode ? "bg-[#0f1623]" : "bg-white"
            } rounded-2xl p-4 text-center border ${
              darkMode ? "border-red-900/30" : "border-red-200"
            }`}
          >
            <p className="text-red-400">{lastError}</p>
          </div>
        )}

        <div
          className={`${
            darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"
          } rounded-2xl p-5 border`}
        >
          <h2 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">
            📈 SYMBOL PERFORMANCE
          </h2>

          <div className="space-y-3">
            {effectiveSymbolRows.map((item) => {
              const pnl = selectedScope === "7d" ? toNumber(item.total_pnl_7d) : toNumber(item.total_pnl_30d);
              const wr = selectedScope === "7d" ? toNumber(item.winrate_7d) : toNumber(item.winrate_30d);
              const trades = selectedScope === "7d" ? toNumber(item.trades_7d) : toNumber(item.trades_30d);

              return (
                <div
                  key={item.symbol}
                  className={`${
                    darkMode
                      ? "bg-[#1a2332]/50 border-gray-800/50"
                      : "bg-gray-50 border-gray-200"
                  } rounded-xl p-4 border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{item.symbol}</h3>
                    <div className="flex items-center gap-2">
                      {pnl >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmtSigned(pnl, 2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm gap-3 flex-wrap">
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      {trades} trades
                    </span>
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      Win rate: {fmtPercent(wr, 2)}
                    </span>
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      Avg: {fmtSigned(trades > 0 ? pnl / trades : 0, 2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
