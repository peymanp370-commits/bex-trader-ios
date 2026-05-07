import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDateTime,
  formatNumber,
  getLanguage,
  isRTL,
  markRTL,
  t,
  type SupportedLanguage,
} from "../utils/i18n";
import { AppHeader } from "../components/AppHeader";

type Trade = {
  deal_id: string;
  account_login?: string;
  client_id?: string;
  symbol: string;
  pnl_net: number;
  close_time: number;
  final_trade_result?: string;
};

type RangeKey = "7D" | "30D" | "ALL";

type CachePayload = {
  account: string;
  clientId: string;
  savedAt: number;
  trades: Trade[];
};

const HISTORY_BASE =
  import.meta.env.VITE_MT5_HISTORY_API_URL ||
  import.meta.env.VITE_HISTORY_API_URL ||
  "https://bex-mt5-history-ingest.peymanp370.workers.dev";

const ACCOUNT_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function getStored(keys: string[]) {
  for (const key of keys) {
    try {
      const v = localStorage.getItem(key);
      if (v && v.trim()) return v.trim();
    } catch {}
  }
  return "";
}

function cacheKey(account: string, clientId: string) {
  return `bex_account_stats_cache_v2:${account || "none"}:${clientId || "none"}`;
}

function normalizeTrade(raw: any): Trade | null {
  const dealId = String(raw?.deal_id || raw?.deal_ticket || raw?.ticket || "").trim();
  const symbol = String(raw?.symbol || "").trim().toUpperCase();
  const closeTime = Number(raw?.close_time || raw?.time || 0);
  const pnl = Number(raw?.pnl_net ?? raw?.net_profit ?? raw?.profit ?? 0);

  if (!dealId || !symbol || !Number.isFinite(closeTime) || closeTime <= 0) return null;

  return {
    deal_id: dealId,
    account_login: String(raw?.account_login || raw?.account || ""),
    client_id: String(raw?.client_id || raw?.client || ""),
    symbol,
    pnl_net: Number.isFinite(pnl) ? pnl : 0,
    close_time: closeTime,
    final_trade_result: String(raw?.final_trade_result || ""),
  };
}

function rangeLabel(range: RangeKey, lang: SupportedLanguage) {
  if (range === "7D") return t("seven_days", lang);
  if (range === "30D") return t("thirty_days", lang);
  return t("all", lang);
}

function loadCached(account: string, clientId: string): CachePayload | null {
  try {
    const raw = localStorage.getItem(cacheKey(account, clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.trades)) return null;
    if (String(parsed.account || "") !== String(account || "")) return null;
    if (String(parsed.clientId || "") !== String(clientId || "")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCached(account: string, clientId: string, trades: Trade[]) {
  try {
    const payload: CachePayload = { account, clientId, savedAt: Date.now(), trades };
    localStorage.setItem(cacheKey(account, clientId), JSON.stringify(payload));
  } catch {}
}

function Card({
  title,
  value,
  tone,
  darkMode = true,
}: {
  title: string;
  value: string | number;
  tone?: "good" | "bad";
  darkMode?: boolean;
}) {
  const color =
    tone === "good"
      ? darkMode
        ? "text-emerald-300"
        : "text-emerald-600"
      : tone === "bad"
        ? darkMode
          ? "text-red-300"
          : "text-red-600"
        : darkMode
          ? "text-white"
          : "text-slate-950";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        darkMode
          ? "border-white/10 bg-white/[0.04] shadow-lg shadow-black/20"
          : "border-gray-200 bg-white shadow-sm"
      }`}
    >
      <div
        className={`text-xs uppercase tracking-[0.18em] ${
          darkMode ? "text-sky-200/70" : "text-slate-500"
        }`}
      >
        {title}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function MyStats() {
  const [lang, setLang] = useState<SupportedLanguage>(getLanguage());
  const [range, setRange] = useState<RangeKey>("7D");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  const account = getStored(["account_login", "mt5_account_login", "bex_account_login"]);
  const clientId = getStored(["client_id", "bex_client_id"]);

  useEffect(() => {
    const onLang = () => setLang(getLanguage());
    window.addEventListener("languageChange", onLang as EventListener);
    window.addEventListener("storage", onLang);
    return () => {
      window.removeEventListener("languageChange", onLang as EventListener);
      window.removeEventListener("storage", onLang);
    };
  }, []);

  const fetchFresh = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set("limit", "1000");
    qs.set("closed", "true");
    if (account) qs.set("account_login", account);
    if (clientId) qs.set("client_id", clientId);

    const res = await fetch(`${HISTORY_BASE}/history?${qs.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || data?.reason || `HTTP ${res.status}`);
    }

    const list = Array.isArray(data?.trades)
      ? data.trades
      : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.items)
          ? data.items
          : [];

    return list.map(normalizeTrade).filter(Boolean) as Trade[];
  }, [account, clientId]);

  const load = useCallback(
    async (force = false) => {
      setError("");

      const cached = loadCached(account, clientId);
      if (cached) {
        setTrades(cached.trades);
        setLastUpdated(cached.savedAt);
        setFromCache(true);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const cacheFresh = cached && Date.now() - Number(cached.savedAt || 0) < ACCOUNT_CACHE_TTL_MS;
      if (!force && cacheFresh) return;

      try {
        const freshTrades = await fetchFresh();
        setTrades(freshTrades);
        setLastUpdated(Date.now());
        setFromCache(false);
        saveCached(account, clientId, freshTrades);
      } catch (e: any) {
        if (!cached) setError(e?.message || t("could_not_load_account_stats", lang));
      } finally {
        setLoading(false);
      }
    },
    [account, clientId, fetchFresh, lang]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("themeChange", handleThemeChange as EventListener);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("themeChange", handleThemeChange as EventListener);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const days = range === "7D" ? 7 : range === "30D" ? 30 : null;
    return trades
      .filter((trade) => {
        if (!days) return true;
        return now - trade.close_time <= days * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => b.close_time - a.close_time);
  }, [trades, range]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const wins = filtered.filter((x) => x.pnl_net > 0).length;
    const losses = filtered.filter((x) => x.pnl_net < 0).length;
    const pnl = filtered.reduce((sum, x) => sum + x.pnl_net, 0);
    const grossWin = filtered.filter((x) => x.pnl_net > 0).reduce((sum, x) => sum + x.pnl_net, 0);
    const grossLossAbs = Math.abs(filtered.filter((x) => x.pnl_net < 0).reduce((sum, x) => sum + x.pnl_net, 0));
    const winRate = total ? (wins / total) * 100 : 0;
    const avgPnl = total ? pnl / total : 0;
    const profitFactor = grossLossAbs > 0 ? grossWin / grossLossAbs : grossWin > 0 ? grossWin : 0;

    const bySymbol = new Map<string, { trades: number; pnl: number; wins: number; losses: number }>();
    for (const trade of filtered) {
      const row = bySymbol.get(trade.symbol) || { trades: 0, pnl: 0, wins: 0, losses: 0 };
      row.trades += 1;
      row.pnl += trade.pnl_net;
      if (trade.pnl_net > 0) row.wins += 1;
      if (trade.pnl_net < 0) row.losses += 1;
      bySymbol.set(trade.symbol, row);
    }

    const symbols = Array.from(bySymbol.entries())
      .map(([symbol, row]) => ({ symbol, ...row, winRate: row.trades ? (row.wins / row.trades) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);

    return { total, wins, losses, pnl, winRate, avgPnl, profitFactor, symbols };
  }, [filtered]);

  const chartTrades = useMemo(() => [...filtered].sort((a, b) => a.close_time - b.close_time).slice(-80), [filtered]);
  const maxAbsPnl = Math.max(1, ...chartTrades.map((v) => Math.abs(v.pnl_net)));
  const rtl = isRTL(lang);
  const nextRefreshAt = lastUpdated ? lastUpdated + ACCOUNT_CACHE_TTL_MS : null;

  return (
    <main className={`${darkMode ? "bg-[#05070d] text-white" : "bg-gray-50 text-gray-900"} min-h-screen pb-24`} {...markRTL(lang)}>
      <AppHeader
        title={t("account_page", lang)}
        subtitle={t("personal_trading_account", lang)}
        darkMode={darkMode}
        onBackClick={() => window.history.back()}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", JSON.stringify(next)); window.dispatchEvent(new Event("themeChange")); }}
        showSettings={true}
        showThemeToggle={true}
        rtl={rtl}
      />
      <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-amber-300/80">BEX Trader</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("account_page", lang)}</h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{t("personal_trading_account", lang)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["7D", "30D", "ALL"] as RangeKey[]).map((item) => (
              <button
                key={item}
                onClick={() => setRange(item)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  range === item
                    ? "border-amber-300 bg-amber-300 text-black"
                    : darkMode ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-slate-700 shadow-sm hover:bg-gray-50"
                }`}
              >
                {rangeLabel(item, lang)}
              </button>
            ))}
            <button
              onClick={() => load(true)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${darkMode ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-slate-700 shadow-sm hover:bg-gray-50"}`}
            >
              {t("refresh", lang)}
            </button>
          </div>
        </div>

        <div className={`mb-5 grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-2 ${darkMode ? "border-white/10 bg-white/[0.03] text-slate-300" : "border-gray-200 bg-white text-slate-700 shadow-sm"}`}>
          <div>
            <span className="text-slate-500">{t("account", lang)}: </span>
            <span className={`font-semibold ${darkMode ? "text-white" : "text-slate-950"}`}>{account || "—"}</span>
          </div>
          <div className={rtl ? "sm:text-left" : "sm:text-right"}>
            <span className="text-slate-500">{t("client", lang)}: </span>
            <span className={`font-semibold ${darkMode ? "text-white" : "text-slate-950"}`}>{clientId || "—"}</span>
          </div>
        </div>

        <div className={`mb-5 rounded-2xl border p-3 text-xs ${darkMode ? "border-amber-300/15 bg-amber-300/[0.04] text-amber-100/80" : "border-amber-300/30 bg-amber-50 text-amber-900"}`}>
          {lastUpdated ? (
            <>
              {t("last_updated", lang)}: {formatDateTime(lastUpdated, lang)}
              {fromCache ? ` • ${t("showing_saved_data", lang)}` : ""}
              {nextRefreshAt ? ` • ${t("next_auto_update", lang)}: ${formatDateTime(nextRefreshAt, lang)}` : ""}
            </>
          ) : (
            t("account_cache_note", lang)
          )}
        </div>

        {loading ? (
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-gray-200 bg-white text-slate-700 shadow-sm"}`}>{t("loading", lang)}</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error}</div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Card darkMode={darkMode} title={t("trades", lang)} value={formatNumber(stats.total, lang)} />
              <Card darkMode={darkMode} title={t("wins", lang)} value={formatNumber(stats.wins, lang)} tone="good" />
              <Card darkMode={darkMode} title={t("losses", lang)} value={formatNumber(stats.losses, lang)} tone="bad" />
              <Card darkMode={darkMode} title={t("win_rate", lang)} value={`${formatNumber(stats.winRate, lang, { maximumFractionDigits: 1 })}%`} />
              <Card darkMode={darkMode} title={t("net_pnl", lang)} value={formatNumber(stats.pnl, lang, { maximumFractionDigits: 2 })} tone={stats.pnl >= 0 ? "good" : "bad"} />
              <Card darkMode={darkMode} title={t("avg_trade", lang)} value={formatNumber(stats.avgPnl, lang, { maximumFractionDigits: 2 })} tone={stats.avgPnl >= 0 ? "good" : "bad"} />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white shadow-sm"}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{t("trade_pnl_chart", lang)}</h2>
                    <div className="mt-1 text-xs text-slate-500">{t("green_profit_red_loss", lang)}</div>
                  </div>
                  <span className="text-xs text-slate-500">{formatNumber(chartTrades.length, lang)} pts</span>
                </div>
                <div className={`flex h-48 items-end gap-1 rounded-xl p-3 ${darkMode ? "bg-black/20" : "bg-slate-100"}`}>
                  {chartTrades.length === 0 ? (
                    <div className="m-auto text-sm text-slate-500">{t("no_personal_trades", lang)}</div>
                  ) : (
                    chartTrades.map((trade, index) => {
                      const h = Math.max(5, Math.min(100, (Math.abs(trade.pnl_net) / maxAbsPnl) * 100));
                      return (
                        <div
                          key={`${trade.deal_id}-${index}`}
                          title={`${trade.symbol} ${trade.pnl_net}`}
                          className={`w-full rounded-t ${trade.pnl_net >= 0 ? "bg-emerald-400/80" : "bg-red-400/80"}`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white shadow-sm"}`}>
                <h2 className="mb-4 text-lg font-semibold">{t("symbol_breakdown", lang)}</h2>
                <div className="space-y-3">
                  {stats.symbols.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("no_personal_trades", lang)}</div>
                  ) : (
                    stats.symbols.map((row) => (
                      <div key={row.symbol} className={`rounded-xl p-3 ${darkMode ? "bg-black/20" : "bg-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{row.symbol}</span>
                          <span className={row.pnl >= 0 ? "text-emerald-300" : "text-red-300"}>
                            {formatNumber(row.pnl, lang, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatNumber(row.trades, lang)} {t("trades", lang)} • {formatNumber(row.winRate, lang, { maximumFractionDigits: 1 })}%
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="mb-4 text-lg font-semibold">{t("latest_trades_title", lang)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="py-3">{t("symbol", lang)}</th>
                      <th className="py-3">{t("pnl", lang)}</th>
                      <th className="py-3">{t("time", lang)}</th>
                      <th className="py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? "divide-y divide-white/10" : "divide-y divide-gray-200"}>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          {t("no_personal_trades", lang)}
                        </td>
                      </tr>
                    ) : (
                      filtered.slice(0, 50).map((trade) => (
                        <tr key={trade.deal_id} className={darkMode ? "text-slate-200" : "text-slate-800"}>
                          <td className="py-3 font-semibold">{trade.symbol}</td>
                          <td className={`py-3 font-semibold ${trade.pnl_net >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {formatNumber(trade.pnl_net, lang, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-slate-400">{formatDateTime(trade.close_time, lang)}</td>
                          <td className="py-3 text-slate-500">{trade.deal_id}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
          </div>
</main>
  );
}

export default MyStats;
