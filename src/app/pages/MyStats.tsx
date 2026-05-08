import { useCallback, useEffect, useMemo, useState } from "react";
import { SideMenu } from "../components/SideMenu";
import { BottomNav } from "../components/BottomNav";
import { AppHeader } from "../components/AppHeader";
import {
  formatDateTime,
  formatNumber,
  getLanguage,
  isRTL,
  markRTL,
  t,
  type SupportedLanguage,
} from "../utils/i18n";

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
  darkMode,
}: {
  title: string;
  value: string | number;
  tone?: "good" | "bad";
  darkMode: boolean;
}) {
  const color = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : darkMode ? "text-white" : "text-gray-900";
  return (
    <div className={`${darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200"} rounded-2xl p-5 border shadow-lg`}>
      <div className="text-xs uppercase tracking-[0.18em] text-yellow-400 font-bold">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export function MyStats() {
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });
  const [lang, setLang] = useState<SupportedLanguage>(getLanguage());
  const [range, setRange] = useState<RangeKey>("7D");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const account = getStored(["account_login", "mt5_account_login", "bex_account_login"]);
  const clientId = getStored(["client_id", "bex_client_id"]);

  useEffect(() => {
    const onLang = () => setLang(getLanguage());
    window.addEventListener("languageChange", onLang as EventListener);
    window.addEventListener("langChange", onLang as EventListener);
    window.addEventListener("storage", onLang);
    return () => {
      window.removeEventListener("languageChange", onLang as EventListener);
      window.removeEventListener("langChange", onLang as EventListener);
      window.removeEventListener("storage", onLang);
    };
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("storage", handleThemeChange);
    window.addEventListener("themeChange", handleThemeChange as EventListener);
    return () => {
      window.removeEventListener("storage", handleThemeChange);
      window.removeEventListener("themeChange", handleThemeChange as EventListener);
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

  const panelClass = darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200";
  const softPanelClass = darkMode ? "bg-[#1a2332]/50" : "bg-gray-50";
  const mutedText = darkMode ? "text-gray-400" : "text-gray-500";
  const mainText = darkMode ? "text-white" : "text-gray-900";
  const tableText = darkMode ? "text-gray-200" : "text-gray-700";

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-[#0a0e1a] text-white" : "bg-gray-50 text-gray-900"} pb-24`}
      {...markRTL(lang)}
    >
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
      <AppHeader
        title={t("account_page", lang)}
        subtitle={t("personal_trading_account", lang)}
        darkMode={darkMode}
        onMenuClick={() => setShowMenu(true)}
        onToggleDark={() => {
          const next = !darkMode;
          setDarkMode(next);
          localStorage.setItem("darkMode", JSON.stringify(next));
          window.dispatchEvent(new Event("themeChange"));
        }}
        showSettings={true}
        showThemeToggle={true}
      />

      <div className="p-4 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["7D", "30D", "ALL"] as RangeKey[]).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all sm:flex-none ${
                range === item
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                  : `${panelClass} border ${mutedText}`
              }`}
            >
              {rangeLabel(item, lang)}
            </button>
          ))}
          <button
            onClick={() => load(true)}
            className={`${panelClass} ${mutedText} rounded-xl border px-4 py-3 text-sm font-bold transition-all hover:opacity-80`}
          >
            {t("refresh", lang)}
          </button>
        </div>

        <div className={`${panelClass} rounded-2xl p-5 border`}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className={mutedText}>{t("account", lang)}: </span>
              <span className={`font-bold ${mainText}`}>{account || "—"}</span>
            </div>
            <div className={rtl ? "sm:text-left" : "sm:text-right"}>
              <span className={mutedText}>{t("client", lang)}: </span>
              <span className={`font-bold ${mainText}`}>{clientId || "—"}</span>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-100" : "bg-yellow-50 border-yellow-200 text-yellow-800"} rounded-2xl p-4 border text-xs`}>
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
          <div className={`${panelClass} ${mutedText} rounded-2xl p-6 border`}>{t("loading", lang)}</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">{error}</div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card darkMode={darkMode} title={t("trades", lang)} value={formatNumber(stats.total, lang)} />
              <Card darkMode={darkMode} title={t("wins", lang)} value={formatNumber(stats.wins, lang)} tone="good" />
              <Card darkMode={darkMode} title={t("losses", lang)} value={formatNumber(stats.losses, lang)} tone="bad" />
              <Card darkMode={darkMode} title={t("win_rate", lang)} value={`${formatNumber(stats.winRate, lang, { maximumFractionDigits: 1 })}%`} />
              <Card darkMode={darkMode} title={t("net_pnl", lang)} value={formatNumber(stats.pnl, lang, { maximumFractionDigits: 2 })} tone={stats.pnl >= 0 ? "good" : "bad"} />
              <Card darkMode={darkMode} title={t("avg_trade", lang)} value={formatNumber(stats.avgPnl, lang, { maximumFractionDigits: 2 })} tone={stats.avgPnl >= 0 ? "good" : "bad"} />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <div className={`${panelClass} rounded-2xl p-5 border`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-bold ${mainText}`}>{t("trade_pnl_chart", lang)}</h2>
                    <div className={`mt-1 text-xs ${mutedText}`}>{t("green_profit_red_loss", lang)}</div>
                  </div>
                  <span className={`text-xs ${mutedText}`}>{formatNumber(chartTrades.length, lang)} pts</span>
                </div>
                <div className={`flex h-48 items-end gap-1 rounded-xl p-3 ${softPanelClass}`}>
                  {chartTrades.length === 0 ? (
                    <div className={`m-auto text-sm ${mutedText}`}>{t("no_personal_trades", lang)}</div>
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

              <div className={`${panelClass} rounded-2xl p-5 border`}>
                <h2 className={`mb-4 text-lg font-bold ${mainText}`}>{t("symbol_breakdown", lang)}</h2>
                <div className="space-y-3">
                  {stats.symbols.length === 0 ? (
                    <div className={`text-sm ${mutedText}`}>{t("no_personal_trades", lang)}</div>
                  ) : (
                    stats.symbols.map((row) => (
                      <div key={row.symbol} className={`${softPanelClass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{row.symbol}</span>
                          <span className={row.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {formatNumber(row.pnl, lang, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`mt-1 text-xs ${mutedText}`}>
                          {formatNumber(row.trades, lang)} {t("trades", lang)} • {formatNumber(row.winRate, lang, { maximumFractionDigits: 1 })}%
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={`${panelClass} rounded-2xl p-5 border`}>
              <h2 className={`mb-4 text-lg font-bold ${mainText}`}>{t("latest_trades_title", lang)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className={`text-xs uppercase tracking-[0.16em] ${mutedText}`}>
                    <tr>
                      <th className={`py-3 ${rtl ? "text-right" : "text-left"}`}>{t("symbol", lang)}</th>
                      <th className={`py-3 ${rtl ? "text-right" : "text-left"}`}>{t("pnl", lang)}</th>
                      <th className={`py-3 ${rtl ? "text-right" : "text-left"}`}>{t("time", lang)}</th>
                      <th className={`py-3 ${rtl ? "text-right" : "text-left"}`}>ID</th>
                    </tr>
                  </thead>
                  <tbody className={`${darkMode ? "divide-white/10" : "divide-gray-200"} divide-y`}>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`py-6 text-center ${mutedText}`}>
                          {t("no_personal_trades", lang)}
                        </td>
                      </tr>
                    ) : (
                      filtered.slice(0, 50).map((trade) => (
                        <tr key={trade.deal_id} className={tableText}>
                          <td className="py-3 font-bold">{trade.symbol}</td>
                          <td className={`py-3 font-bold ${trade.pnl_net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatNumber(trade.pnl_net, lang, { maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-3 ${mutedText}`}>{formatDateTime(trade.close_time, lang)}</td>
                          <td className={`py-3 ${mutedText}`}>{trade.deal_id}</td>
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

      <BottomNav />
    </div>
  );
}

export default MyStats;
